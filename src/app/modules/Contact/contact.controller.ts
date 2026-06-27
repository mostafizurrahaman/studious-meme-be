import { asyncHandler, sendResponse } from '../../utils';
import { ContactService } from './contact.service';
import httpStatus from 'http-status';

// 1. adminGetAllContacts
const adminGetAllContacts = asyncHandler(async (req, res) => {
  const result = await ContactService.adminGetAllContactsFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Contacts fetched successfully!',
    data: result.data,
    meta: result.meta,
  });
});

// 2. createContact
const createContact = asyncHandler(async (req, res) => {
  const result = await ContactService.createContactInDB(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Message created successfully!',
    data: result,
  });
});

export const ContactController = {
  adminGetAllContacts,
  createContact,
};
