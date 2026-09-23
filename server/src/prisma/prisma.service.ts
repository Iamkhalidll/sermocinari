import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        const connectionString = process.env.DATABASE_URL;

        if (!connectionString) {
            throw new Error('DATABASE_URL is not configured');
        }

        super({ adapter: new PrismaPg({ connectionString }) });
    }

    async onModuleInit() {
        await (this.$connect as () => Promise<void>)();
    }

    async onModuleDestroy() {
        await (this.$disconnect as () => Promise<void>)();
    }

}
