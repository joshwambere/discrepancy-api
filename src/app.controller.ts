import {
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import { AnyFilesInterceptor } from '@nestjs/platform-express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  @Post('upload')
  @UseInterceptors(AnyFilesInterceptor())
  async uploadFile(@UploadedFiles() files: Array<Express.Multer.File>) {
    const percentage = await this.appService.compareFiles(files);
    return {
      discrepancy: percentage.differences.toFixed(2) + '%',
      totalMatch: percentage.totalMatches,
    };
  }

  @Post('upload/generic')
  @UseInterceptors(AnyFilesInterceptor())
  async discrepancyBusinessCom(
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    const percentage = await this.appService.discrepancyGeneric(files);
    return {
      discrepancy: percentage.differences.toFixed(2) + '%',
      totalMatch: percentage.totalMatches,
    };
  }
}
