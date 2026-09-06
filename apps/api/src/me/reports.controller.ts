import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateReportDto } from './reports.dto';
import { ReportsService } from './reports.service';

@Controller('me/reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: CreateReportDto) {
    return this.reports.create(user.id, body);
  }
}
