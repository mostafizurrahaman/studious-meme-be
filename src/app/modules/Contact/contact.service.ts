import ContactModel from './contact.model';
import { IContact } from './contact.interface';
import { AppError } from '../../utils';
import httpStatus from 'http-status';
import { TMeta } from '../../utils/sendResponse';

const DEFAULT_CONTACT_LIMIT = 50;

// 1. adminGetAllContactsFromDB
const adminGetAllContactsFromDB = async (
  query: Record<string, unknown>,
): Promise<{ data: IContact[]; meta: TMeta }> => {
  const { page, limit, searchTerm } = query;

  const pageNumber = Number(page) || 1;
  const limitNumber = Number(limit) || DEFAULT_CONTACT_LIMIT;
  const skip = (pageNumber - 1) * limitNumber;

  const filters: Record<string, unknown> = {};

  if (searchTerm) {
    filters.$or = [
      { name: { $regex: searchTerm, $options: 'i' } },
      { company: { $regex: searchTerm, $options: 'i' } },
      { email: { $regex: searchTerm, $options: 'i' } },
      { subject: { $regex: searchTerm, $options: 'i' } },
      { products: { $regex: searchTerm, $options: 'i' } },
      { brand: { $regex: searchTerm, $options: 'i' } },
      { message: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  const [contacts, total] = await Promise.all([
    ContactModel.find(filters)
      .select('-updatedAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber),
    ContactModel.countDocuments(filters),
  ]);

  const meta: TMeta = {
    page: pageNumber,
    limit: limitNumber,
    total,
    totalPages: Math.ceil(total / limitNumber) || 0,
  };

  return { data: contacts, meta };
};

// 2. createContactInDB
const createContactInDB = async (contactData: IContact) => {
  const contact = await ContactModel.create(contactData);

  if (!contact) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create message!');
  }

  return null;
};

export const ContactService = {
  adminGetAllContactsFromDB,
  createContactInDB,
};
