import { WxPay } from 'yungouos-pay-node-sdk'; // if this is your library for the WxPay object

// The environment variables MCH_ID and PAYKEY should be defined in your .env file
const mch_id = process.env.MCH_ID;
const payKey = process.env.PAYKEY;
const body = 'chatwise 充值';
const notify_url = 'your_notify_url_here'; // replace with your actual notify URL

// I'm assuming all the other inputs should be null based on your instructions
const type = null;
const app_id = null;
const attach = null;
const auto = null;
const auto_node = null;
const config_no = null;
const biz_params = null;

export const yungouwxpay = async (total_fee: number, out_trade_no: string): Promise<string> => {
  try {
    const result = await WxPay.nativePayAsync(
      out_trade_no,
      total_fee.toString(),
      mch_id,
      body,
      type,
      app_id,
      attach,
      notify_url,
      auto,
      auto_node,
      config_no,
      biz_params,
      payKey
    );

    return result;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Yungouos SDK error: ${error.message}`);
    } else {
      throw new Error('Yungouos SDK error');
    }
  }
};
