import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async create(name: string) {
    // Ensure category with name doesn't exist
    const categoryExists = await this.categoryRepository.findOne({
      where: { name },
    });

    if (categoryExists) {
      throw new BadRequestException('Category already exists');
    }

    // generate slug for category
    const slug = name.toLowerCase().replace(/\s+/g, '-');

    // create and save to the db
    const category = this.categoryRepository.create({ name, slug });
    await this.categoryRepository.save(category);

    return {
      statusCoder: HttpStatus.CREATED,
      success: true,
      message: 'Category created successfully',
      data: category,
    };
  }

  findAll() {
    return `This action returns all category`;
  }

  findOne(id: number) {
    return `This action returns a #${id} category`;
  }

  update(id: number, updateCategoryDto: UpdateCategoryDto) {
    return `This action updates a #${id} category`;
  }

  remove(id: number) {
    return `This action removes a #${id} category`;
  }
}
