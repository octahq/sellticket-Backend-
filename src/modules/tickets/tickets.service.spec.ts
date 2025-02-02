import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketsService } from './tickets.service';
import { Ticket } from './entities/ticket.entity';
import { Event } from '../event/entities/event.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TicketStatus, TicketType } from './enums';

describe('TicketsService', () => {
  let service: TicketsService;
  let ticketRepository: Repository<Ticket>;
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        {
          provide: getRepositoryToken(Ticket),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Event),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    ticketRepository = module.get<Repository<Ticket>>(
      getRepositoryToken(Ticket),
    );
    eventRepository = module.get<Repository<Event>>(getRepositoryToken(Event));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
    });

    it('should throw NotFoundException when event does not exist', async () => {
      jest.spyOn(eventRepository, 'findOne').mockResolvedValue(null);

      await expect(service.createTicket(createTicketDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for paid ticket without price', async () => {
      const invalidTicketDto = {
        ...createTicketDto,
        basePrice: null,
      };

      jest
        .spyOn(eventRepository, 'findOne')
        .mockResolvedValue(mockEvent as Event);

      await expect(service.createTicket(invalidTicketDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for token-gated ticket without required fields', async () => {
      const invalidTicketDto = {
        ...createTicketDto,
        type: TicketType.TOKEN_GATED,
        tokenGatingType: null,
        contractAddress: null,
      };

      jest
        .spyOn(eventRepository, 'findOne')
        .mockResolvedValue(mockEvent as Event);

      await expect(service.createTicket(invalidTicketDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAllTickets', () => {
    it('should return all tickets', async () => {
      const mockTickets = [mockTicket];
      jest
        .spyOn(ticketRepository, 'find')
        .mockResolvedValue(mockTickets as Ticket[]);

      const result = await service.findAllTickets();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTickets);
      expect(ticketRepository.find).toHaveBeenCalledWith({
        relations: ['event'],
      });
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
