import { model, Schema } from 'mongoose';
import { IContact } from './contact.interface';

const contactSchema = new Schema<IContact>(
  {
    name: {
      type: String,
      required: [true, 'Name is required!'],
    },
    company: {
      type: String,
    },
    email: {
      type: String,
      required: [true, 'Email is required!'],
    },
    phone: {
      type: String,
      required: [true, 'Phone is required!'],
    },

    subject: {
      type: String,
      required: [true, 'Subject is required!'],
    },
    products: {
      type: String,
      required: [true, 'Interested products are required!'],
    },
    brand: {
      type: String,
    },

    message: {
      type: String,
      required: [true, 'Message is required!'],
    },

    isReplied: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true, versionKey: false },
);

const ContactModel = model<IContact>('Contact', contactSchema);

export default ContactModel;
