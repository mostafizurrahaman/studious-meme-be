import { CategoryModel } from '../Category/category.model';
import { BrandModel } from '../Brand/brand.model';
import { ProductModel } from '../Product/product.model';
import UserModel from '../User/user.model';
import { OrderModel } from '../Order/order.model';
import { Payment } from '../Payment/payment.model';
import { ROLE } from '../User/user.constant';

const getDashboardOverviewFromDB = async (userRole: string, userId: string) => {
  if (userRole === ROLE.SUPER_ADMIN || userRole === ROLE.ADMIN) {
    const [categories, brands, products, users, orders, payments, admins] =
      await Promise.all([
        CategoryModel.countDocuments(),
        BrandModel.countDocuments(),
        ProductModel.countDocuments(),
        UserModel.countDocuments({ role: ROLE.USER }),
        OrderModel.countDocuments(),
        Payment.countDocuments(),
        userRole === ROLE.SUPER_ADMIN ? UserModel.countDocuments({ role: ROLE.ADMIN }) : Promise.resolve(0),
      ]);

    return {
      categories,
      brands,
      products,
      users,
      orders,
      payments,
      admins,
    };
  }

  // User role overview
  if (userRole === ROLE.USER) {
    const userOrders = await OrderModel.find({ user: userId })
      .select('orderId status paymentStatus total')
      .sort({ createdAt: -1 })
      .lean();

    const payments = await Payment.countDocuments({ user: userId });
    const pendingPayments = userOrders.filter(
      (order) => order.paymentStatus !== 'PAID'
    ).length;
    const delivered = userOrders.filter(
      (order) => order.status === 'DELIVERED'
    ).length;

    return {
      orders: userOrders.length,
      pendingPayments,
      delivered,
      payments,
      recentOrders: userOrders.slice(0, 5),
    };
  }

  return {};
};

export const DashboardService = {
  getDashboardOverviewFromDB,
};
