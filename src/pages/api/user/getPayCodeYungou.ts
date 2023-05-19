import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/service/response';
import { authToken } from '@/service/utils/auth';
import { customAlphabet } from 'nanoid';
import { connectToDatabase, Pay } from '@/service/mongo';
import { PRICE_SCALE } from '@/constants/common';
import { WxPay } from 'yungouos-pay-node-sdk';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz1234567890', 20);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    let { amount = 0 } = req.query as { amount: string };
    amount = +amount;
    const userId = await authToken(req);
    const id = nanoid();
    await connectToDatabase();

    // 使用YunGouOS的nativePayAsync方法获取支付二维码
    const code_url = await WxPay.nativePayAsync(
      null,
      amount * 100,
      '1644830908',
      '充值',
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      'F77A8C237E2246A6ACC56CC23448EB92'
    );

    // 充值记录 + 1
    const payOrder = await Pay.create({
      userId,
      price: amount * PRICE_SCALE,
      orderId: id
    });

    jsonRes(res, {
      data: {
        payId: payOrder._id,
        codeUrl: code_url
      }
    });
  } catch (err) {
    console.log(err, '==');
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
