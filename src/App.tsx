import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout, BarberLayout, CustomerLayout, ProtectedRoute, PublicLayout } from "./components";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Booking from "./pages/Booking";
import BookingSuccess from "./pages/BookingSuccess";
import CustomerDashboard from "./pages/CustomerDashboard";
import Admin from "./pages/Admin";
import AdminBookings from "./pages/AdminBookings";
import AdminServices from "./pages/AdminServices";
import AdminBarbers from "./pages/AdminBarbers";
import AdminCustomers from "./pages/AdminCustomers";
import BarberDashboard from "./pages/BarberDashboard";

export default function App(){
 return <Routes>
  <Route element={<PublicLayout/>}>
   <Route path="/" element={<Home/>}/>
   <Route path="/booking" element={<Booking/>}/>
   <Route path="/booking/success/:id" element={<BookingSuccess/>}/>
   <Route path="/login" element={<Login/>}/>
  </Route>
  <Route element={<ProtectedRoute roles={["customer","admin","barber"]}/>}>
   <Route element={<CustomerLayout/>}><Route path="/dashboard" element={<CustomerDashboard/>}/></Route>
  </Route>
  <Route element={<ProtectedRoute roles={["admin"]}/>}><Route element={<AdminLayout/>}>
   <Route path="/admin" element={<Admin/>}/>
   <Route path="/admin/bookings" element={<AdminBookings/>}/>
   <Route path="/admin/services" element={<AdminServices/>}/>
   <Route path="/admin/barbers" element={<AdminBarbers/>}/>
   <Route path="/admin/customers" element={<AdminCustomers/>}/>
  </Route></Route>
  <Route element={<ProtectedRoute roles={["barber"]}/>}><Route element={<BarberLayout/>}><Route path="/barber" element={<BarberDashboard/>}/></Route></Route>
  <Route path="*" element={<Navigate to="/" replace/>}/>
 </Routes>;
}
