import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketsService } from './tickets.service';
import { Ticket } from './entities/ticket.entity';
import { TicketPurchase } from './entities/ticket.purchase.entity';
import { TicketResale } from './entities/ticket.resale.entity';
import { Event } from '../event/entities/event.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TicketStatus, TicketType } from './enums';

describe('TicketsService', () => {
  let service: TicketsService;
  let ticketRepository: Repository<Ticket>;
  let purchaseRepository: Repository<TicketPurchase>;
  let resaleRepository: Repository<TicketResale>;
  let eventRepository: Repository<Event>;

  const mockEvent = {
    id: 1,
    name: 'Test Event',
    description: 'Test Description',
  };

  const mockTicket = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'VIP Ticket',
    type: TicketType.PAID,
    basePrice: 100,
    quantity: 10,
    status: TicketStatus.AVAILABLE,
    eventId: 1,
    event: mockEvent,
  };

  const mockPurchase = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    ticketId: mockTicket.id,
    quantity: 2,
    buyerEmail: 'test@example.com',
    buyerFirstName: 'John',
    buyerLastName: 'Doe',
  };

  const mockResale = {
    id: '123e4567-e89b-12d3-a456-426614174002',
    ticketId: mockTicket.id,
    resalePrice: 150,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        {
          provide: getRepositoryToken(Ticket),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TicketPurchase),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TicketResale),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Event),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    ticketRepository = module.get<Repository<Ticket>>(
      getRepositoryToken(Ticket),
    );
    purchaseRepository = module.get<Repository<TicketPurchase>>(
      getRepositoryToken(TicketPurchase),
    );
    resaleRepository = module.get<Repository<TicketResale>>(
      getRepositoryToken(TicketResale),
    );
    eventRepository = module.get<Repository<Event>>(getRepositoryToken(Event));
  });

  describe('createTicket', () => {
    const createTicketDto = {
      name: 'VIP Ticket',
      type: TicketType.PAID,
      basePrice: 100,
      quantity: 10,
      eventId: 1,
      isGroupTicket: false,
    };

    it('should create a ticket successfully', async () => {
      jest
        .spyOn(eventRepository, 'findOne')
        .mockResolvedValue(mockEvent as Event);
      jest
        .spyOn(ticketRepository, 'create')
        .mockReturnValue(mockTicket as Ticket);
      jest
        .spyOn(ticketRepository, 'save')
        .mockResolvedValue(mockTicket as Ticket);

      const result = await service.createTicket(createTicketDto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTicket);
      expect(eventRepository.findOne).toHaveBeenCalled();
      expect(ticketRepository.create).toHaveBeenCalled();
      expect(ticketRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when event does not exist', async () => {
      jest.spyOn(eventRepository, 'findOne').mockResolvedValue(null);

      await expect(service.createTicket(createTicketDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for paid ticket without price', async () => {
      const invalidDto = { ...createTicketDto, basePrice: null };
      jest
        .spyOn(eventRepository, 'findOne')
        .mockResolvedValue(mockEvent as Event);

      await expect(service.createTicket(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('purchaseTicket', () => {
    const purchaseDto = {
      ticketId: mockTicket.id,
      quantity: 2,
      buyerEmail: 'test@example.com',
      buyerFirstName: 'John',
      buyerLastName: 'Doe',
    };

    it('should process ticket purchase successfully', async () => {
      jest
        .spyOn(ticketRepository, 'findOne')
        .mockResolvedValue(mockTicket as Ticket);
      jest
        .spyOn(purchaseRepository, 'create')
        .mockReturnValue(mockPurchase as TicketPurchase);
      jest
        .spyOn(purchaseRepository, 'save')
        .mockResolvedValue(mockPurchase as TicketPurchase);

      const result = await service.purchaseTicket(purchaseDto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPurchase);
    });

    it('should throw NotFoundException when ticket does not exist', async () => {
      jest.spyOn(ticketRepository, 'findOne').mockResolvedValue(null);

      await expect(service.purchaseTicket(purchaseDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when quantity exceeds available tickets', async () => {
      const invalidDto = { ...purchaseDto, quantity: 20 };
      jest
        .spyOn(ticketRepository, 'findOne')
        .mockResolvedValue(mockTicket as Ticket);

      await expect(service.purchaseTicket(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('createTicketResale', () => {
    const resaleDto = {
      ticketId: mockTicket.id,
      resalePrice: 150,
    };

    const resaleEnabledTicket = {
      ...mockTicket,
      isResaleEnabled: true,
      maxResellPrice: 200,
    };

    it('should create resale listing successfully', async () => {
      jest
        .spyOn(ticketRepository, 'findOne')
        .mockResolvedValue(resaleEnabledTicket as Ticket);
      jest
        .spyOn(resaleRepository, 'create')
        .mockReturnValue(mockResale as TicketResale);
      jest
        .spyOn(resaleRepository, 'save')
        .mockResolvedValue(mockResale as TicketResale);

      const result = await service.createTicketResale(resaleDto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResale);
    });

    it('should throw BadRequestException when resale is not enabled', async () => {
      jest
        .spyOn(ticketRepository, 'findOne')
        .mockResolvedValue({ ...mockTicket, isResaleEnabled: false } as Ticket);

      await expect(service.createTicketResale(resaleDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when price exceeds max resell price', async () => {
      const invalidDto = { ...resaleDto, resalePrice: 250 };
      jest
        .spyOn(ticketRepository, 'findOne')
        .mockResolvedValue(resaleEnabledTicket as Ticket);

      await expect(service.createTicketResale(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findTicketById', () => {
    it('should return a ticket successfully', async () => {
      jest
        .spyOn(ticketRepository, 'findOne')
        .mockResolvedValue(mockTicket as Ticket);

      const result = await service.findTicketById(mockTicket.id);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTicket);
    });

    it('should throw NotFoundException when ticket does not exist', async () => {
      jest.spyOn(ticketRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findTicketById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findTicketsByEvent', () => {
    it('should return all tickets for an event', async () => {
      const mockTickets = [mockTicket];
      jest
        .spyOn(ticketRepository, 'find')
        .mockResolvedValue(mockTickets as Ticket[]);

      const result = await service.findTicketsByEvent(1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTickets);
      expect(ticketRepository.find).toHaveBeenCalledWith({
        where: { eventId: 1 },
        relations: ['event'],
      });
    });
  });
});
