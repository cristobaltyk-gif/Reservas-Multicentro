import { BrowserRouter, Routes, Route } from "react-router-dom";
import BookingMulticentro from "../pages/BookingMulticentro";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<BookingMulticentro />} />
      </Routes>
    </BrowserRouter>
  );
}
