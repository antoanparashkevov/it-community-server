const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

//models
const User = require('../models/User');
const Company = require('../models/Company');

let tokenBlackList = new Set();

async function register(email,password) {
    const isExisting = await User.findOne({email}).collation({ locale:'en', strength:2 })
    
    if( isExisting ) {
        throw new Error('Email is taken')
    }
    const hashedPassword = await bcrypt.hash(password,10)//we save only the hashed password to the Database
    
    const user = await User.create({
        email,
        hashedPassword,
        roles: ['user']
    });

    return createToken(user, 'user')
    
}

async function login(email,password) {
    const user = await User.findOne({email}).collation({locale: 'en', strength: 2})
    
    if(!user) {
        throw new Error ('Incorrect email or password')
    }
    
    //it will return true of false
    const matchPassword = await bcrypt.compare(password, user['hashedPassword']);
    
    if( !matchPassword ) {
        throw new Error ('Incorrect email or password')
    }
    
    return createToken(user, 'user')
}

async function registerAsCompany(email,password, companyName, desc, employees, foundationYear, logoUrl = null) {
    const isExisting = await Company.findOne({email}).collation({ locale:'en', strength:2 })

    if( isExisting ) {
        throw new Error('Email is taken')
    }
    
    const hashedPassword = await bcrypt.hash(password,10)//we save only the hashed password to the Database

    const companyFields = {
        email,
        hashedPassword,
        companyName,
        desc,
        foundationYear,
        employees,
        roles: ['user', 'company']
    }

    if ( logoUrl ) {
        companyFields = {
            ...companyFields,
            logo: logoUrl
        }
    }
    const user = await Company.create(companyFields);

    return createToken(user, 'company')
}

async function loginAsCompany(email,password) {
    const user = await Company.findOne({email}).collation({locale: 'en', strength: 2})
    
    if(!user) {
        throw new Error ('Incorrect email or password')
    }

    //it will return true of false
    const matchPassword = await bcrypt.compare(password, user['hashedPassword']);

    if( !matchPassword ) {
        throw new Error ('Incorrect email or password')
    }

    return createToken(user, 'company')
}

async function logout(token) {
    tokenBlackList.add(token);
}

const createToken = function(user, role) {
    let payload;

    payload = {
        _id: user._id,
        email: user.email,
        roles: user.roles
    };
    
    if( role === 'company' ) {
        payload.companyName = user.companyName
        payload.foundationYear = user.foundationYear
        payload.employees = user.employees
        payload.desc = user.desc
        payload.logo = user.logo
    }
    
   return {
       accessToken: jwt.sign(payload, process.env['JWT_SECRET'], { expiresIn: '1h'}),
       _id: user._id,
       email: user.email,
       roles: user.roles
   }
}

function parseToken(token) {
    
    if(tokenBlackList.has(token)) {
        throw new Error('The token is blacklisted!')
    }
    
    /* PAYLOAD TO RETURN
    * _id: user._id
    * email: user.email
    * companyName?: role.companyName,
    * role: user.role
    * */
    
    return jwt.verify(token,process.env['JWT_SECRET']) //the payload
}

module.exports = {
    register,
    login,
    registerAsCompany,
    loginAsCompany,
    logout,
    parseToken
}