const express = require('express');
const path = require('path')
const BlockService = require('./block_service');
const AssetService = require('./asset-service')
const { requireAuth } = require('../middleware/jwt-auth');
const { requireAPIToken } = require('../middleware/api-auth');
const { getImages, uploadImage } = require('./asset-controller')
const upload = require('./asset-service')


const BlockRouter = express.Router();
const jsonParser = express.json();

BlockRouter
    .route('/recent-blocks')
    // .all(requireAPIToken)
    .get((req, res, next) => {
        BlockService.getAllRecentBlocks(
            req.app.get('db')
        )
    .then(blocks => {
        res.json(blocks)
    })
    .catch(next)
    })

BlockRouter
    .route('/:category/:id')
    // .all(requireAPIToken)
    .all(requireAuth)
    .all((req, res, next) => {
        BlockService.getBlockById(
            req.app.get('db'),
            req.params.category,
            req.params.id)
    
    .then(block => {
        if(!block) {
            return res.status(404).json({
                error: {message: `Block doesn't exist`}
            })
            
        }
        res.block = block
        next()
    })
    .catch(next)
    })
    .get((req, res, next) => {
        res.json(res.block)
    })

    .patch(jsonParser, (req, res, next) => {
        const { id, block_file, block_description, feedback_details, date_updated } = req.body
        const newBlock = { id, block_file, block_description, feedback_details }

        newBlock.date_updated = new Date();
        newBlock.user_id = req.user.id

        BlockService.updateBlock(
            req.app.get('db'),
            req.params.id,
            newBlock
        )
        .then(numRowsAffected => {
            res.status(204).end()
        })
        .catch(next)
    })

BlockRouter
    .route('/upload')
    // .all(requireAuth)
    .post(jsonParser, (req, res, next) => {
       
        const { user_name, category_id, block_title, block_file, block_description, feedback_details, date_updated } = req.body;
        const userName = user_name 

        const user_id = BlockService.getUserId(
            req.app.get('db'),
            req.body.user_name
        )
        let block_url = ''
        const newBlock = { user_name, user_id, category_id, block_url, block_title, block_description, feedback_details }

        // for(const [key, value] of Object.entries(newBlock)) {
        //     if(value === null) {
        //         return res.status(400).json({
        //             error: {message: `Missing '${key}' in request body`}
        //         })
        //     }
        // }

        newBlock.date_updated = new Date();
        newBlock.user_id = user_id
        
        

        AssetService.uploadAsset(
            block_file,
            category_id
        )
        .then(asset => {
            console.log(asset)
            newBlock.block_url = asset.url
        })
        console.log(newBlock)

        BlockService.postBlock(
            req.app.get('db'),
            newBlock
        )
        .then(block => {
            res.status(201)
                .location(path.posix.join(req.originalUrl, `/${block.user_name}/${block.category_id}/${block.id}`))
                .json(block)
        })
        
        .catch(next)
    })


module.exports = BlockRouter