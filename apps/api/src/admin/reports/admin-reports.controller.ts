import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import type { AuthUser } from '../../auth/auth-user';
import { CurrentUser } from '../../auth/current-user.decorator';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { ReviewReportDto } from './admin-reports.dto';
import { AdminReportsService } from './admin-reports.service';

@Controller('admin/reports')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class AdminReportsController {
  constructor(private readonly reports: AdminReportsService) {}

  @Get()
  list() {
    return this.reports.list();
  }

  @Patch(':id')
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: ReviewReportDto,
  ) {
    return this.reports.review(id, user.id, body);
  }
}
