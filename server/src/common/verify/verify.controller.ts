import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { VerifyService } from './verify.service';

@ApiTags('Verification')
@Controller('verify')
export class VerifyController {
  constructor(private readonly verifyService: VerifyService) {}

  @Get(':hash')
  @ApiOperation({ summary: 'Verify a document by its QR hash (public, no auth required)' })
  async verifyDocument(@Param('hash') hash: string) {
    const result = await this.verifyService.verifyDocument(hash);
    if (!result) {
      throw new NotFoundException('Document not found or invalid verification hash');
    }
    return {
      success: true,
      message: 'Document verified successfully',
      data: result,
    };
  }
}
