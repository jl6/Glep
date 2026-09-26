module.exports = {
    name: 'clientReady',
    once: true,
    execute(client) { 
        client.user.setActivity('Prefix :  _', { type: 4 });
        console.log(`Logged in as ${client.user.tag}`);
    }
};

/* 
1 = streaming 
2 = listening 
3 = watching
4 = status 




*/