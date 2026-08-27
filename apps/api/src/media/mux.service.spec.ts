import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { MuxService } from './mux.service';

describe('MuxService webhook verification', () => {
  const secret = 'local-test-webhook-secret';
  const config = {
    get: jest.fn((name: string) =>
      name === 'MUX_WEBHOOK_SECRET' ? secret : undefined,
    ),
  } as unknown as ConfigService;
  const service = new MuxService(config);

  it('accepts a correctly signed raw webhook body', () => {
    const body = Buffer.from(
      JSON.stringify({ type: 'video.asset.ready', data: { id: 'asset-1' } }),
    );
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createHmac('sha256', secret)
      .update(`${timestamp}.${body.toString('utf8')}`)
      .digest('hex');

    expect(
      service.verifyWebhook(body, `t=${timestamp},v1=${signature}`),
    ).toEqual(expect.objectContaining({ type: 'video.asset.ready' }));
  });

  it('rejects a forged signature', () => {
    const body = Buffer.from('{}');
    const timestamp = Math.floor(Date.now() / 1000).toString();

    expect(() =>
      service.verifyWebhook(body, `t=${timestamp},v1=${'0'.repeat(64)}`),
    ).toThrow('Mux webhook 簽章驗證失敗');
  });

  it('rejects a replayed webhook older than five minutes', () => {
    const body = Buffer.from('{}');
    const timestamp = (Math.floor(Date.now() / 1000) - 301).toString();
    const signature = createHmac('sha256', secret)
      .update(`${timestamp}.${body.toString('utf8')}`)
      .digest('hex');

    expect(() =>
      service.verifyWebhook(body, `t=${timestamp},v1=${signature}`),
    ).toThrow('Mux webhook 已過期');
  });
});
