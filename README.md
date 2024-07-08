![Khoury Odyssey Logo](frontend/public/logo.svg)

# Khoury Odyssey Monorepo

This monorepo contains the repositories for Khoury Odyssey's NextJS-powered frontend (in [`/frontend`](/frontend)) and Strapi-powered CMS backend (in [`/backend`](/backend)).

See each subdirectory's README for installation instructions and additional information.

## Table of Contents

1. [About](#about)
2. [Installation](#installation)
   - [Architecture](#architecture)
3. [Contributing](#contributing)
4. [Contributors](#contributors)

## About

Odyssey is a new platform designed to provide on-demand access to modern knowledge and skills pertinent to today’s undergraduate Khoury students.

### Architecture

The frontend and backend are both deployed through Digital Ocean. Assets are uploaded to Digital Ocean Spaces. Platform content—managed through the backend—is stored in a Digital Ocean Postgres database.

## Installation

To install Odyssey locally, follow these steps:

1. Clone the repository: `git clone https://github.com/KhourySpecialProjects/odyssey.git`
2. Navigate to the project directory: `cd odyssey`
3. Install general dependencies: `npm install`
4. Install sub-repo dependencies: `npm run setup`
5. Set up frontend/backend environment variables. See each sub-repo's `README.md` file
6. Start the application: `npm run dev`

## Contributing

To contribute to Odyssey's source code:

- Create a new branch: `git checkout -b feature/[description]`, where `[description]` is a concise name for the feature being implemented
- Make your changes and commit them: `git commit -m 'Add new feature'`
- Push to the branch: `git push origin feature/[description]`
- Submit a pull request

## Contributors

Sponsor: [@MarkFontenot](https://github.com/MarkFontenot)

This platform was built by Jay Sella ([@jaysella](https://github.com/jaysella)).
