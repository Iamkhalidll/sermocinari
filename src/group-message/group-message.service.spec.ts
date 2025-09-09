import { Test, TestingModule } from '@nestjs/testing';
import { GroupMessageService } from './group-message.service';

describe('GroupMessageService', () => {
  let service: GroupMessageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GroupMessageService],
    }).compile();

    service = module.get<GroupMessageService>(GroupMessageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
