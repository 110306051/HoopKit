import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getServiceInfo() {
    return {
      name: 'HoopKit API',
      version: 'v1',
    } as const;
  }

  @Get('health/live')
  getLiveness() {
    return {
      status: 'ok',
      service: 'hoopkit-api',
    } as const;
  }
}
