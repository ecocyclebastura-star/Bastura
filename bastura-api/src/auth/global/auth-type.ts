type LoginPayload = {
    action : 'LOGIN';
    email? : string ;
    username? : string;
    password : string;
}

type LogoutPayload = {
    action : 'LOGOUT';
    rf_token : string;
}

type ForgotPasswordPayload = {
    action : 'FORGOT_PASSWORD';
    email : string;
}

type ChangePasswordPayload = {
    action : 'CHANGE_PASSWORD';
    old_password : string;
    new_password : string;
    confirm_password : string;
}

type SignupPayload = {
    action : 'SIGNUP';
    email : string;
    name : string;
    password : string;
    phone : number;
    confirm_password : string;
}

export type AuthPayload = LoginPayload | LogoutPayload | ForgotPasswordPayload | ChangePasswordPayload | SignupPayload;