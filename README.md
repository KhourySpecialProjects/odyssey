![Khoury Odyssey Logo](frontend/public/logo.svg)

# Khoury Odyssey Monorepo

This monorepo contains the repositories for Khoury Odyssey's NextJS-powered frontend (in [`frontend`](/frontend)) and Strapi-powered CMS backend (in [`backend`](/backend)).

See each subsection for installation instructions and additional details.

## Table of Contents

1. [Installation](#installation)
2. [Contributing](#contributing)
3. [Contributors](#contributors)

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

This repo was set up by Jay Sella ([@jaysella](https://github.com/jaysella)).
