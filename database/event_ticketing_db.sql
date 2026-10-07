-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 07, 2026 at 10:31 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `event_ticketing_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

CREATE TABLE `bookings` (
  `booking_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `booking_status` enum('PENDING','CONFIRMED','CANCELLED') DEFAULT 'PENDING',
  `booking_date` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bookings`
--

INSERT INTO `bookings` (`booking_id`, `user_id`, `event_id`, `quantity`, `total_price`, `booking_status`, `booking_date`) VALUES
(1, 4, 1, 2, 100.00, 'CONFIRMED', '2026-10-06 15:39:33'),
(2, 5, 2, 1, 80.00, 'CONFIRMED', '2026-10-06 15:39:33'),
(3, 4, 3, 1, 0.00, 'CONFIRMED', '2026-10-06 15:39:33'),
(4, 5, 4, 2, 60.00, 'PENDING', '2026-10-06 15:39:33'),
(5, 4, 5, 1, 40.00, 'CONFIRMED', '2026-10-06 15:39:33');

-- --------------------------------------------------------

--
-- Table structure for table `events`
--

CREATE TABLE `events` (
  `event_id` int(11) NOT NULL,
  `organiser_id` int(11) NOT NULL,
  `venue_id` int(11) NOT NULL,
  `event_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `event_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `ticket_price` decimal(10,2) NOT NULL,
  `ticket_quantity` int(11) NOT NULL,
  `status` enum('ACTIVE','CANCELLED','COMPLETED') DEFAULT 'ACTIVE'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `events`
--

INSERT INTO `events` (`event_id`, `organiser_id`, `venue_id`, `event_name`, `description`, `event_date`, `start_time`, `end_time`, `ticket_price`, `ticket_quantity`, `status`) VALUES
(1, 2, 1, 'Technology Conference 2026', 'Annual technology conference.', '2026-11-10', '09:00:00', '17:00:00', 50.00, 300, 'ACTIVE'),
(2, 3, 2, 'Music Festival', 'Live music performances.', '2026-11-15', '18:00:00', '23:00:00', 80.00, 700, 'ACTIVE'),
(3, 2, 3, 'Career Fair 2026', 'Career opportunities and networking.', '2026-11-20', '10:00:00', '16:00:00', 0.00, 500, 'ACTIVE'),
(4, 3, 4, 'Business Workshop', 'Workshop for young entrepreneurs.', '2026-12-01', '09:00:00', '13:00:00', 30.00, 200, 'ACTIVE'),
(5, 2, 5, 'Cybersecurity Seminar', 'Cybersecurity awareness seminar.', '2026-12-05', '10:00:00', '15:00:00', 40.00, 350, 'ACTIVE');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('ADMIN','ORGANISER','CUSTOMER') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `name`, `email`, `password_hash`, `role`, `created_at`) VALUES
(1, 'Admin User', 'admin@event.com', 'TEMP_HASH_ADMIN', 'ADMIN', '2026-10-06 15:14:07'),
(2, 'Ali Hakim', 'ali@event.com', 'TEMP_HASH_ALI', 'ORGANISER', '2026-10-06 15:14:07'),
(3, 'Sarah Lim', 'sarah@event.com', 'TEMP_HASH_SARAH', 'ORGANISER', '2026-10-06 15:14:07'),
(4, 'Amir Danish', 'amir@gmail.com', 'TEMP_HASH_AMIR', 'CUSTOMER', '2026-10-06 15:14:07'),
(5, 'Nur Aina', 'aina@gmail.com', 'TEMP_HASH_AINA', 'CUSTOMER', '2026-10-06 15:14:07');

-- --------------------------------------------------------

--
-- Table structure for table `venues`
--

CREATE TABLE `venues` (
  `venue_id` int(11) NOT NULL,
  `venue_name` varchar(150) NOT NULL,
  `location` varchar(255) NOT NULL,
  `capacity` int(11) NOT NULL,
  `status` enum('ACTIVE','INACTIVE') DEFAULT 'ACTIVE'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `venues`
--

INSERT INTO `venues` (`venue_id`, `venue_name`, `location`, `capacity`, `status`) VALUES
(1, 'UPTM Main Hall', 'Cheras, Kuala Lumpur', 600, 'ACTIVE'),
(2, 'KL Convention Centre', 'Kuala Lumpur', 1000, 'ACTIVE'),
(3, 'Putrajaya Event Hall', 'Putrajaya', 700, 'ACTIVE'),
(4, 'Community Auditorium', 'Selangor', 300, 'ACTIVE'),
(5, 'Technology Centre Hall', 'Cyberjaya', 450, 'ACTIVE');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`booking_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `event_id` (`event_id`);

--
-- Indexes for table `events`
--
ALTER TABLE `events`
  ADD PRIMARY KEY (`event_id`),
  ADD KEY `organiser_id` (`organiser_id`),
  ADD KEY `venue_id` (`venue_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `venues`
--
ALTER TABLE `venues`
  ADD PRIMARY KEY (`venue_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `booking_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `events`
--
ALTER TABLE `events`
  MODIFY `event_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `venues`
--
ALTER TABLE `venues`
  MODIFY `venue_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`event_id`) REFERENCES `events` (`event_id`);

--
-- Constraints for table `events`
--
ALTER TABLE `events`
  ADD CONSTRAINT `events_ibfk_1` FOREIGN KEY (`organiser_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `events_ibfk_2` FOREIGN KEY (`venue_id`) REFERENCES `venues` (`venue_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
