# Polling System

A dynamic web application that allows users to create and participate in polls, providing real-time results and a user-friendly interface.

## Features

- **Create Polls**: Users can design polls with custom titles, descriptions, and multiple-choice options.
- **Real-Time Voting**: Votes are updated instantly with percentage-based results.
- **Voter Authentication**: Ensures each voter casts only one vote by verifying their identity.
- **Poll Duration Settings**: Admins can set time limits for polls or keep them open indefinitely.
- **Responsive Design**: Optimized for both desktop and mobile devices.
- **Interactive UI**: Features smooth animations, toast notifications, and modal dialogs for an enhanced user experience.

## Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js with Express.js
- **Real-Time Communication**: Socket.IO
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)

## Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v14 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) (local or cloud instance)

## Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/Shreyanka20/Polling_System.git
   cd Polling_System

2. **Install Dependencies**:


   ```bash
    npm install

3. **Modify the .env file as per choice**:

4. **Open two terminals**:

   ```bash
   cd client
   npm run dev

   cd server
   npm run dev
