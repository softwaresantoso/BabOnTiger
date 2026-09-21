import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout, BarberLayout, CustomerLayout, ProtectedRoute, PublicLayout } from "./components";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Booking from "./pages/Booking";
import BookingSuccess from "./pages/BookingSuccess";
import CustomerDashboard from "./pages/CustomerDashboard";
import Admin from "./pages/OwnerDashboard";
import AdminBookings from "./pages/OwnerBookings";
import AdminServices from "./pages/OwnerServices";
import AdminBarbers from "./pages/OwnerBarbers";
import AdminCustomers from "./pages/OwnerCustomers";
import BarberDashboard from "./pages/BarberDashboard";
import QueueBoard from "./pages/QueueBoard";
import BranchDetail from "./pages/BranchDetail";
import CustomerAccount from "./pages/CustomerAccount";
import Transactions from "./pages/Transactions";
import OwnerProducts from "./pages/OwnerProducts";
import OwnerPromos from "./pages/OwnerPromos";
import CustomerPromos from "./pages/CustomerPromos";
import OwnerAttendance from "./pages/OwnerAttendance";
import BarberCheckIn from "./pages/BarberCheckIn";

export default function App() {
  return <Routes>
    <Route element={<PublicLayout />}>
      <Route path="/" element={<Home />} />
      <Route path="/booking" element={<Booking />} />
      <Route path="/branch/:branchId" element={<BranchDetail />} />
      <Route path="/queue/:branchId" element={<QueueBoard />} />
      <Route path="/booking/success/:id" element={<BookingSuccess />} />
      <Route path="/login" element={<Login />} />
    </Route>

    <Route element={<ProtectedRoute roles={["customer"]} />}>
      <Route element={<CustomerLayout />}>
        <Route path="/dashboard" element={<CustomerDashboard />} />
        <Route path="/account" element={<CustomerAccount />} />
        <Route path="/promos" element={<CustomerPromos />} />
      </Route>
    </Route>

    <Route element={<ProtectedRoute roles={["owner"]} />}>
      <Route element={<AdminLayout />}>
        <Route path="/owner" element={<Admin />} />
        <Route path="/owner/bookings" element={<AdminBookings />} />
        <Route path="/owner/services" element={<AdminServices />} />
        <Route path="/owner/barbers" element={<AdminBarbers />} />
        <Route path="/owner/customers" element={<AdminCustomers />} />
        <Route path="/owner/transactions" element={<Transactions />} />
        <Route path="/owner/products" element={<OwnerProducts />} />
        <Route path="/owner/promos" element={<OwnerPromos />} />
        <Route path="/owner/attendance" element={<OwnerAttendance />} />
        <Route path="/admin" element={<Navigate to="/owner" replace />} />
        <Route path="/admin/*" element={<Navigate to="/owner" replace />} />
      </Route>
    </Route>

    <Route element={<ProtectedRoute roles={["barber"]} />}>
      <Route element={<BarberLayout />}>
        <Route path="/barber" element={<BarberDashboard />} />
        <Route path="/barber/check-in" element={<BarberCheckIn />} />
        <Route path="/barber/transactions" element={<Transactions barberOnly />} />
      </Route>
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
