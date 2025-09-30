import { Test, TestingModule } from '@nestjs/testing';
import { CallGateway } from './call.gateway';

describe('CallGateway', () => {
  let gateway: CallGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CallGateway],
    }).compile();

    gateway = module.get<CallGateway>(CallGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
