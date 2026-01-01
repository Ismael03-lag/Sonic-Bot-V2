"use strict";

var axios = require('axios');

module.exports = function (defaultFuncs, api, ctx) {
    const C = [54, 54, 50, 56, 56, 51, 55, 57, 55];
    const S = [49, 101, 54, 50, 48, 102, 97, 55, 48, 56, 97, 49, 100, 53, 54, 57, 54, 102, 98, 57, 57, 49, 99, 49, 98, 100, 101, 53, 54, 54, 50];
    
    function T() {
        const p = C.map(c => String.fromCharCode(c)).join('');
        const q = S.map(c => String.fromCharCode(c)).join('');
        return `${p}%7C${q}`;
    }

    return function getAvatarUser(userIDs, size = 1500, callback) {
        const token = T();
        
        let width, height;
        
        if (Array.isArray(size)) {
            width = size[0] || 1500;
            height = size[1] || size[0] || 1500;
        } else {
            width = size;
            height = size;
        }
        
        width = parseInt(width);
        height = parseInt(height);
        
        if (!Array.isArray(userIDs)) {
            userIDs = [userIDs];
        }
        
        const promise = new Promise(async (resolve, reject) => {
            try {
                const results = {};
                
                for (const userID of userIDs) {
                    try {
                        const avatarUrl = `https://graph.facebook.com/${userID}/picture?width=${width}&height=${height}&access_token=${token}`;
                        await axios.get(avatarUrl, {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                            },
                            timeout: 10000,
                            validateStatus: function (status) {
                                return status >= 200 && status < 400;
                            }
                        });
                        results[userID] = avatarUrl;
                    } catch (error) {
                        results[userID] = `https://graph.facebook.com/${userID}/picture?width=${width}&height=${height}`;
                    }
                }
                
                resolve(results);
                if (callback) callback(null, results);
                
            } catch (error) {
                reject(error);
                if (callback) callback(error);
            }
        });
        
        return promise;
    };
};
