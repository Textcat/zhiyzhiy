import { PaySignUtil } from 'yungouos-pay-node-sdk';
import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/service/response';
import { connectToDatabase, User, Pay } from '@/service/mongo';
import { PaySchema, UserModelSchema } from '@/types/mongoSchema';
import dayjs from 'dayjs';
import { pushPromotionRecord } from '@/service/utils/promotion';
import { PRICE_SCALE } from '@/constants/common';

const payKey = process.env.PAYKEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    //获取支付系统传递的参数
    const { orderNo, outTradeNo, payNo, money, mchId, code, sign } = req.body;

    let params = {
      code: code,
      orderNo: orderNo,
      outTradeNo: outTradeNo,
      payNo: payNo,
      money: money,
      mchId: mchId
    };

    // 验证签名（需要引入签名工具 PaySignUtil 并使用商户密钥进行验证）
    const isValidSign = PaySignUtil.checkNotifySign(params, sign, payKey);

    if (!isValidSign) {
      return res.status(400).json({ message: 'Invalid signature' });
    }

    // 在这里处理支付成功后的逻辑，例如更新订单状态、通知用户等
    await connectToDatabase();
    const payOrder = await Pay.findOne<PaySchema>({ orderId: outTradeNo });

    if (!payOrder) {
      throw new Error('订单不存在');
    }

    if (payOrder.status !== 'NOTPAY') {
      throw new Error('订单已结算');
    }
    const payId = payOrder._id;

    // 获取 userId
    const userId = payOrder.userId;
    // 获取当前用户
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('找不到用户');
    }

    // 获取邀请者
    let inviter: UserModelSchema | null = null;
    if (user.inviterId) {
      inviter = await User.findById(user.inviterId);
    }

    // 校验下是否超过一天
    const orderTime = dayjs(payOrder.createTime);
    const diffInHours = dayjs().diff(orderTime, 'hours');

    if (code === '1') {
      // 订单已支付
      try {
        // 更新订单状态. 如果没有合适的订单，说明订单重复了
        const updateRes = await Pay.updateOne(
          {
            _id: payId,
            status: 'NOTPAY'
          },
          {
            status: 'SUCCESS'
          }
        );
        if (updateRes.modifiedCount === 1) {
          // 给用户账号充钱
          await User.findByIdAndUpdate(userId, {
            $inc: { balance: payOrder.price }
          });
          // 推广佣金发放
          if (inviter) {
            pushPromotionRecord({
              userId: inviter._id,
              objUId: userId,
              type: 'invite',
              // amount 单位为元，需要除以缩放比例，最后乘比例
              amount: (payOrder.price / PRICE_SCALE) * inviter.promotion.rate * 0.01
            });
          }
          jsonRes(res, {
            code: 200,
            message: 'SUCCESS'
          });
        }
      } catch (error) {
        await Pay.findByIdAndUpdate(payId, {
          status: 'NOTPAY'
        });
        console.log(error);
      }
    } else if (code !== '1' && diffInHours > 24) {
      // 订单已关闭
      await Pay.findByIdAndUpdate(payId, {
        status: 'CLOSED'
      });
    } else {
      throw new Error('订单无效');
    }
  } catch (error) {
    jsonRes(res, {
      code: 500,
      error: error
    });
  }
}
