import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/service/response';
import { connectToDatabase, User, Pay } from '@/service/mongo';
import { authUser } from '@/service/utils/auth';
import { PaySchema, UserModelSchema } from '@/types/mongoSchema';

/* 校验支付结果 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    let { payId } = req.query as { payId: string };

    const { userId } = await authUser({ req, authToken: true });

    await connectToDatabase();

    // 查找订单记录校验
    const payOrder = await Pay.findById<PaySchema>(payId);

    if (!payOrder) {
      throw new Error('订单不存在');
    }
    if (payOrder.status === 'SUCCESS') {
      jsonRes(res, {
        data: '支付成功'
      });
    } else {
      jsonRes(res, {
        code: 500,
        error: '尚未支付'
      });
    }
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
