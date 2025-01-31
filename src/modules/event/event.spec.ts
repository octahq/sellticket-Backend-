import { Test, TestingModule } from '@nestjs/testing';
import { CategoryService } from '../category/category.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Category } from '../category/entities/category.entity';
import { Repository } from 'typeorm';

describe('CategoryService', () => {
  let service: CategoryService;
  let repo: Repository<Category>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: getRepositoryToken(Category),
          useClass: Repository, // Mock TypeORM Repository
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    repo = module.get<Repository<Category>>(getRepositoryToken(Category));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a category successfully', async () => {
      const categoryName = 'Music';
      const category = { id: 1, name: categoryName, slug: 'music', createdAt: new Date(), updatedAt: new Date() };

      jest.spyOn(repo, 'findOne').mockResolvedValue(null); // Ensure category does not exist
      jest.spyOn(repo, 'create').mockReturnValue(category as any); // ✅ Mock create() method
      jest.spyOn(repo, 'save').mockResolvedValue(category); // Mock save()

      const result = await service.create(categoryName);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe(categoryName);
    });

    it('should throw an error if category already exists', async () => {
      const categoryName = 'Music';
      const existingCategory = { id: 1, name: categoryName, slug: 'music', createdAt: new Date(), updatedAt: new Date() };

      jest.spyOn(repo, 'findOne').mockResolvedValue(existingCategory); // Mock category found

      await expect(service.create(categoryName)).rejects.toThrowError('Category already exists');
    });
  });
});
