# Technology Stack

## Backend (Node.js)

- **Runtime**: Node.js 20.x
- **Framework**: Express.js 5.x
- **Database ORM**: Sequelize 6.x
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **Validation**: Joi
- **File Upload**: Multer
- **Logging**: Winston

## AI Service (Python)

- **Language**: Python 3.10
- **ML Framework**: PyTorch 2.1.2 (CPU-only)
- **Computer Vision**: OpenCV (opencv-python-headless)
- **Model**: EfficientNet-B2
- **Image Processing**: torchvision, albumentations

## Infrastructure

- **Containerization**: Docker, Docker Compose
- **Database**: PostgreSQL / SQLite
- **Cache**: Redis (for rate limiting & sessions)
- **Process Management**: Node.js child_process for worker pool

## Security

- **Security Headers**: Helmet.js
- **CORS**: Express CORS middleware
- **Rate Limiting**: express-rate-limit + rate-limit-redis
- **CSRF Protection**: Custom CSRF middleware
- **File Validation**: file-type, custom MIME validation

## Testing

- **Test Framework**: Jest 29.x
- **HTTP Testing**: Supertest
- **Test Coverage**: jest-coverage
- **Reporting**: Custom Excel reporter (ExcelJS)

## Development Tools

- **Hot Reload**: nodemon
- **Code Quality**: ESLint (implicit)
- **Version Control**: Git
