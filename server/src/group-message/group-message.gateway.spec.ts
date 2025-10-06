import { Test, TestingModule } from '@nestjs/testing';
import { GroupMessageGateway } from './group-message.gateway';

describe('GroupMessageGateway', () => {
  let gateway: GroupMessageGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GroupMessageGateway],
    }).compile();

    gateway = module.get<GroupMessageGateway>(GroupMessageGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
