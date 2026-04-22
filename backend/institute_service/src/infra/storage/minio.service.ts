import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService {
  private readonly minioClient: Minio.Client;
  private readonly bucketName: string;
  private readonly logger = new Logger(MinioService.name);

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.get<string>(
      'MINIO_BUCKET',
      'smartedx-bucket',
    );

    this.minioClient = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: parseInt(this.configService.get<string>('MINIO_PORT', '9000'), 10),
      useSSL: this.configService.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.configService.get<string>(
        'MINIO_ACCESS_KEY',
        'minioadmin',
      ),
      secretKey: this.configService.get<string>(
        'MINIO_SECRET_KEY',
        'minioadmin',
      ),
    });

    this.checkConnection();
  }

  private async checkConnection() {
    try {
      await this.minioClient.listBuckets();
      this.logger.log('MinIO connected successfully');
    } catch (error) {
      this.logger.error('Error connecting to MinIO:', error);
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    bucket?: string,
  ): Promise<string> {
    const targetBucket = bucket || this.bucketName;
    // Strip characters that are unsafe in URLs (#, ?, &, %, spaces, etc.)
    const safeName = file.originalname.replace(/[#?&%\s]+/g, '_');
    const fileName = `${Date.now()}-${safeName}`;

    try {
      const bucketExists = await this.minioClient.bucketExists(targetBucket);
      if (!bucketExists) {
        await this.minioClient.makeBucket(targetBucket);
        await this.minioClient.setBucketPolicy(
          targetBucket,
          JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: { AWS: ['*'] },
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${targetBucket}/*`],
              },
            ],
          }),
        );
      }
    } catch (err) {
      this.logger.error(`Error checking/creating bucket ${targetBucket}`, err);
    }

    await this.minioClient.putObject(
      targetBucket,
      fileName,
      file.buffer,
      file.size,
      {
        'Content-Type': file.mimetype,
      },
    );

    const protocol =
      this.configService.get<string>('MINIO_USE_SSL') === 'true'
        ? 'https'
        : 'http';
    const host = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = this.configService.get<string>('MINIO_PORT', '9000');

    return `${protocol}://${host}:${port}/${targetBucket}/${fileName}`;
  }

  async getFileUrl(filename: string, bucket?: string): Promise<string> {
    const targetBucket = bucket || this.bucketName;
    const protocol =
      this.configService.get<string>('MINIO_USE_SSL') === 'true'
        ? 'https'
        : 'http';
    const host = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = this.configService.get<string>('MINIO_PORT', '9000');

    return `${protocol}://${host}:${port}/${targetBucket}/${filename}`;
  }

  async deleteFile(filename: string, bucket?: string): Promise<void> {
    const targetBucket = bucket || this.bucketName;
    await this.minioClient.removeObject(targetBucket, filename);
  }
}
