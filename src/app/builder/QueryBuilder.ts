import { Query } from 'mongoose';

class QueryBuilder<T> {
  public modelQuery: Query<T[], T>;
  public query: Record<string, unknown>;

  constructor(queryModel: Query<T[], T>, query: Record<string, unknown>) {
    this.modelQuery = queryModel;
    this.query = query;
  }

  search(searchableFields: string[]) {
    const searchTerm = this?.query?.searchTerm;
    if (searchTerm) {
      const searchConditions = searchableFields.map((field) => ({
        [field]: { $regex: searchTerm, $options: 'i' },
      }));

      this.modelQuery = this?.modelQuery?.find({
        $or: searchConditions,
      });
    }
    return this;
  }

  filter() {
    const queryObject = { ...this?.query };
    const excludeableFields = [
      'searchTerm',
      'sort',
      'page',
      'limit',
      'fields',
      'minPrice',
      'maxPrice',
    ];
    excludeableFields.forEach((field) => delete queryObject[field]);

    this.modelQuery = this?.modelQuery.find(queryObject);
    return this;
  }

  sort() {
    const sortBy =
      (this?.query?.sort as string)?.split(',')?.join(' ') || '-createdAt';
    this.modelQuery = this?.modelQuery.sort(sortBy);
    return this;
  }

  paginate() {
    const page = Number(this?.query?.page) || 1;
    const limit = Number(this?.query?.limit) || 10;
    const skip = (page - 1) * limit;

    this.modelQuery = this?.modelQuery.skip(skip).limit(limit);
    return this;
  }

  fields() {
    const fields = (this?.query?.fields as string)?.split(',')?.join(' ');
    if (fields) {
      this.modelQuery = this?.modelQuery.select(fields);
    }
    return this;
  }

  async countTotal() {
    const totalFilters = this?.modelQuery.getFilter();
    const page = Number(this?.query?.page) || 1;
    const limit = Number(this?.query?.limit) || 10;

    const total = await this?.modelQuery.model.countDocuments(totalFilters);
    const totalPages = Math.ceil(total / limit);

    return {
      page,
      limit,
      total,
      totalPages,
    };
  }

  priceRange() {
    const minPrice = this?.query?.minPrice
      ? Number(this?.query?.minPrice)
      : undefined;
    const maxPrice = this?.query?.maxPrice
      ? Number(this?.query?.maxPrice)
      : undefined;

    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceFilter: Record<string, unknown> = {};
      if (minPrice !== undefined) priceFilter.$gte = minPrice;
      if (maxPrice !== undefined) priceFilter.$lte = maxPrice;

      this.modelQuery = this?.modelQuery?.find({
        price: priceFilter,
      });
    }
    return this;
  }
}

export default QueryBuilder;

// ?searchTerm=javascript&minPrice=100&maxPrice=1000&sort=price,-rating&page=2&limit=10&fields=title,author,price,tag,status&category=programming&language=english
