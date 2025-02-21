import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TicketPurchaseService } from './ticket-purchase.service';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketPurchase } from './entities/ticket.purchase.entity';
import { TicketResale } from './entities/ticket.resale.entity';
import { Repository } from 'typeorm';
import { Redis } from 'ioredis';
import { DataSource } from 'typeorm';
import { CreateTicketPurchaseDto } from '../tickets/dto/create-ticket-purchase.dto';
import { CreateTicketResaleDto } from '../tickets/dto/create-ticket-resale.dto';
import {
  HttpStatus,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TicketStatus } from '../tickets/enums';
import { PurchaseStatus } from './enums';

describe('TicketPurchaseService', () => {
  let service: TicketPurchaseService;
  let ticketRepository: Repository<Ticket>;
  let purchaseRepository: Repository<TicketPurchase>;
  let resaleRepository: Repository<TicketResale>;
  let redis: Redis;
  let dataSource: DataSource;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketPurchaseService,
        {
          provide: getRepositoryToken(Ticket),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(TicketPurchase),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(TicketResale),
          useClass: Repository,
        },
        {
          provide: 'default_IORedisModuleConnectionToken',
          useValue: {
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue({
              connect: jest.fn(),
              startTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              rollbackTransaction: jest.fn(),
              release: jest.fn(),
              manager: {
                findOne: jest.fn(),
                save: jest.fn(),
              },
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TicketPurchaseService>(TicketPurchaseService);
    ticketRepository = module.get<Repository<Ticket>>(
      getRepositoryToken(Ticket),
    );
    purchaseRepository = module.get<Repository<TicketPurchase>>(
      getRepositoryToken(TicketPurchase),
    );
    resaleRepository = module.get<Repository<TicketResale>>(
      getRepositoryToken(TicketResale),
    );
    redis = module.get<Redis>('default_IORedisModuleConnectionToken');
    dataSource = module.get<DataSource>(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('purchaseTicket', () => {
    it('should successfully purchase a ticket', async () => {
      const ticket = new Ticket();
      ticket.id = '1';
      ticket.quantity = 10;
      ticket.status = TicketStatus.AVAILABLE;

      const purchaseDto: CreateTicketPurchaseDto = {
        ticketId: '1',
        quantity: 2,
        buyerEmail: 'test@example.com',
        buyerFirstName: 'John',
        buyerLastName: 'Doe',
      };

      const purchase = new TicketPurchase();
      purchase.id = 'purchase1';
      purchase.ticket = ticket;
      purchase.status = PurchaseStatus.PENDING;

      jest.spyOn(redis, 'set').mockResolvedValue('OK');

      jest.spyOn(purchaseRepository, 'create').mockReturnValue(purchase);
      jest.spyOn(purchaseRepository, 'save').mockResolvedValue(purchase);

      const queryRunner = dataSource.createQueryRunner();
      jest.spyOn(queryRunner.manager, 'findOne').mockResolvedValue(ticket);
      jest
        .spyOn(queryRunner.manager, 'save')
        .mockResolvedValueOnce({ ...ticket, quantity: 8 })
        .mockResolvedValueOnce(purchase);

      const result = await service.purchaseTicket(purchaseDto);

      expect(result.statusCode).toBe(HttpStatus.CREATED);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(purchase);
    });

    it('should throw NotFoundException if ticket does not exist', async () => {
      const purchaseDto: CreateTicketPurchaseDto = {
        ticketId: '1',
        quantity: 2,
        buyerEmail: 'test@example.com',
        buyerFirstName: 'John',
        buyerLastName: 'Doe',
      };

      jest.spyOn(redis, 'set').mockResolvedValue('OK');

      const queryRunner = dataSource.createQueryRunner();
      jest.spyOn(queryRunner.manager, 'findOne').mockResolvedValue(null);

      await expect(service.purchaseTicket(purchaseDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if ticket is not available', async () => {
      const ticket = new Ticket();
      ticket.id = '1';
      ticket.quantity = 10;
      ticket.status = TicketStatus.SOLD_OUT;

      const purchaseDto: CreateTicketPurchaseDto = {
        ticketId: '1',
        quantity: 2,
        buyerEmail: 'test@example.com',
        buyerFirstName: 'John',
        buyerLastName: 'Doe',
      };

      jest
        .spyOn(dataSource.createQueryRunner().manager, 'findOne')
        .mockResolvedValue(ticket);

      await expect(service.purchaseTicket(purchaseDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('resellTicket', () => {
    it('should successfully resell a ticket', async () => {
      const ticket = new Ticket();
      ticket.id = '1';
      ticket.isResaleEnabled = true;
      ticket.maxResellPrice = 100;

      const resaleDto: CreateTicketResaleDto = {
        ticketId: '1',
        resalePrice: 50,
      };

      const resale = new TicketResale();
      resale.id = 'resale1';
      resale.ticket = ticket;

      jest.spyOn(ticketRepository, 'findOne').mockResolvedValue(ticket);
      jest.spyOn(resaleRepository, 'create').mockReturnValue(resale);
      jest.spyOn(resaleRepository, 'save').mockResolvedValue(resale);

      const result = await service.resellTicket(resaleDto);

      expect(result.statusCode).toBe(HttpStatus.CREATED);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Ticket listed for resale successfully');
      expect(result.data).toEqual(resale);
    });

    it('should throw BadRequestException if resale is not enabled', async () => {
      const ticket = new Ticket();
      ticket.id = '1';
      ticket.isResaleEnabled = false;

      const resaleDto: CreateTicketResaleDto = {
        ticketId: '1',
        resalePrice: 50,
      };

      jest.spyOn(ticketRepository, 'findOne').mockResolvedValue(ticket);

      await expect(service.resellTicket(resaleDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateTicket', () => {
    it('should return true for a valid ticket', async () => {
      const ticket = new Ticket();
      ticket.id = '1';
      ticket.status = TicketStatus.SOLD;

      jest.spyOn(ticketRepository, 'findOne').mockResolvedValue(ticket);

      const result = await service.validateTicket('1');

      expect(result.statusCode).toBe(HttpStatus.OK);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Ticket is valid');
      expect(result.data).toBe(true);
    });

    it('should return false for an invalid ticket', async () => {
      const ticket = new Ticket();
      ticket.id = '1';
      ticket.status = TicketStatus.AVAILABLE;

      jest.spyOn(ticketRepository, 'findOne').mockResolvedValue(ticket);

      const result = await service.validateTicket('1');

      expect(result.statusCode).toBe(HttpStatus.OK);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Ticket is not valid');
      expect(result.data).toBe(false);
    });
  });
});
