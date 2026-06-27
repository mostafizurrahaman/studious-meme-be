import { NextFunction, Request, Response } from 'express';

const notFoundHandler = (req: Request, res: Response, _next: NextFunction) => {
  res.status(404).json({
    success: false,
    message: 'API not found!',
    error: {
      path: req.originalUrl,
      message: 'Your requested API endpoint not found!',
    },
  });
};

export default notFoundHandler;

// import { NextFunction, Request, Response } from 'express';

// const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
//   // Log details of the incoming request (e.g., from the browser)
//   console.log('Request Details:');
//   console.log('Path:', req.originalUrl);
//   console.log('Method:', req.method);
//   console.log('Headers:', req.headers);
//   console.log('IP Address:', req.ip);
//   console.log('User-Agent:', req.get('User-Agent'));

//   // Send a 404 response
//   res.status(404).json({
//     success: false,
//     message: 'API not found!',
//     error: {
//       path: req.originalUrl,
//       message: 'Your requested API endpoint not found!',
//     },
//   });
// };

// export default notFoundHandler;
