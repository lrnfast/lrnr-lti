const chai = require('chai')
const chaiHttp = require('chai-http')
const jwt = require('jsonwebtoken')

const chaiAsPromised = require('chai-as-promised')
const express = require('express');
chai.use(chaiAsPromised)
chai.use(chaiHttp)

const expect = chai.expect
const path = require('path')

const lti = require('../dist/Provider/Provider')

const appRoute = '/approute'
const loginRoute = '/loginroute'
const keysetRoute = '/keysetroute'
const dynRegRoute = '/register'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const router = express.Router();
router.get('/private/coursemap', async (req, res) => {
    console.log('tpken', req.locals);
    const token = req.locals?.token || {};
    res.send(token);
});
describe('Testing Private Routes', function () {
    it('Throws 401 unauthorized for non private routes', async () =>{
        const response = await chai.request(lti.app)
            .get('/coursemap')
            .send();
        expect(response).to.have.status(401);
    });
    it('Enters in the private route', async () =>{
        const response = await chai.request(lti.app)
            .get('/private/coursemap')
            .send();
        expect(response.body).to.deep.equal({});
    });
});
