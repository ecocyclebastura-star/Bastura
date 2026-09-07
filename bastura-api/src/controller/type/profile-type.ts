export type getUser = {
    sub : string,
}

export type updateUser = {
    sub : string,
    role : number,
    name : string,
    new_name? : string,
    new_phone? : string,
}

export type updateProfileImg = {
    sub : string,
    name : string,
    role : number,
}

export type deleteUser = {
    sub : string,
    name : string,
    role : number,
}
