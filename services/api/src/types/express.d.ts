declare global { namespace Express { interface Request { auth?: {userId:string;email:string}; requestId?:string } } }
export {};
