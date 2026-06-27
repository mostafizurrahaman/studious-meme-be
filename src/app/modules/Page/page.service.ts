import { TPageSlugs } from './page.constant';
import { IPagePayload } from './page.interface';
import { Page } from './page.model';

// 1. createOrUpdatePageIntoDB
const createOrUpdatePageIntoDB = async (payload: IPagePayload) => {
  const result = await Page.findOneAndUpdate({ slug: payload.slug }, payload, {
    upsert: true,
    returnDocument: 'after',
  });

  return result;
};

// 2. getAllPagesFromDB
const getAllPagesFromDB = async () => {
  const result = await Page.find();

  return result;
};

// 3. getPageBySlugFromDB
const getPageBySlugFromDB = async (slug: TPageSlugs) => {
  const result = await Page.findOne({ slug });

  return result;
};

export const PageService = {
  createOrUpdatePageIntoDB,
  getAllPagesFromDB,
  getPageBySlugFromDB,
};
