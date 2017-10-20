var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var customersList = [], hotelsList = [], conversation = [];

var redis = require('redis');
var redisClient = redis.createClient();

redisClient.on('connect', function() {

    // console.log('connected');
});

redisClient.on("error", function(err) {
});


app.get('/server/chat', function(req, res){
	
  res.sendFile(__dirname + '/index.html');

});
 
io.on('connection', function(socket){

  /*
  *   PER OGNI ID_CUSTOMER/HOTEL MEMORIZZA TUTTE LE SOCKET ASSOCIATE (VARIE TAB DEL BROWSER APERTE)
  */

  socket.on('subscribe', function(data) {
  
    if (data.type == "customer") {

      for (var i=0, n=customersList.length; i<n; i++) 
        if (customersList[i].id == data.id) {

          customersList[i].socket.push(socket.id);
          return false;
        }

      customersList.push({id: data.id, socket: [socket.id]});
    
    } else {

      for (var i=0, n=hotelsList.length; i<n; i++) 
        if (hotelsList[i].id == data.id) {

          hotelsList[i].socket.push(socket.id);
          return false;
        }

      hotelsList.push({id: data.id, socket: [socket.id]});
    }
  });

  //  DI DUBBIA UTILITÁ
  socket.on('hotel_is_connected', function(hotel_id){

    for (var i=0, n=hotelsList.length; i<n; i++)
      if (hotelsList[i].id == hotel_id)
        return true;

    return false;
  });

  socket.on('get-history-conversation', function(data){

    // RITORNARE LO STORICO SOLTANTO ALLA CHAT CHE LO RICHIEDE

    var numMessageReturned = 10;
    var startTail = -(data.time+1)*numMessageReturned;
    var endTail = -(data.time)*numMessageReturned-1;

    if (data.type == "customer") {

      redisClient.lrange("conversation-"+data.id_conversation, startTail, endTail, function(err, reply) {

        for (var i=0, n=customersList.length; i<n; i++) 
          
          if (customersList[i].id == data.from)

            for (var j=0, m=customersList[i].socket.length; j<m; j++)

              if (customersList[i].socket[j] == socket.id) {

                io.sockets.connected[customersList[i].socket[j]].emit('receive-history-conversation', reply);
                return false;
              }
      });

    } else {

      redisClient.lrange("conversation-"+data.id_conversation, startTail, endTail, function(err, reply) {

        for (var i=0, n=hotelsList.length; i<n; i++) 
          
          if (hotelsList[i].id == data.from)

            for (var j=0, m=hotelsList[i].socket.length; j<m; j++)
              
              if (hotelsList[i].socket[j] == socket.id) {

              io.sockets.connected[hotelsList[i].socket[j]].emit('receive-history-conversation', reply);
              return false;
            }
      });
    }
  });

  socket.on('get-customers-list', function(data){

    redisClient.lrange("hotel_recent_users-"+data.hotel_id, 0, -1, function(err, reply) {

      if (reply.length > 0) {

        for (var i=0, n=hotelsList.length; i<n; i++) 
          if (hotelsList[i].id == data.hotel_id) {

            for (var j=0, m=hotelsList[i].socket.length; j<m; j++)
              io.sockets.connected[hotelsList[i].socket[j]].emit('get-customers-list', reply);
            
            return false;
          }
      }

    });
  });

  socket.on('get-hotels-list', function(data){
  

    console.log(data);

    redisClient.lrange("user_recent_hotels-"+data.customer_id, 0, -1, function(err, reply) {

      if (reply.length > 0) { 

        for (var i=0, n=customersList.length; i<n; i++) 
          if (customersList[i].id == data.customer_id) {

            for (var j=0, m=customersList[i].socket.length; j<m; j++)
              io.sockets.connected[customersList[i].socket[j]].emit('get-hotels-list', reply);
            
            return false;
          }
      }

    });
  });

  socket.on('send', function(data){
  
    console.log(data);
    messageRouter(data);
   });

  socket.on('disconnect', function() {

    for (var i=0, n=customersList.length; i<n; i++) {
      
      for (var j=0, m=customersList[i].socket.length; j<m; j++) {
      
        if (customersList[i].socket[j] == socket.id) {

          customersList[i].socket.splice(j, 1);
          return true;
        }
      }
    }
    for (var i=0, n=hotelsList.length; i<n; i++)
      if (hotelsList[i].socket == socket.id) {

        hotelsList.splice(i, 1);
        return true;
      }
  });


});

http.listen(port, function(){

  console.log('listening on *:' + port);
});


function messageRouter(data) {

  var hotel, customer, userRecentListJSON, hotelRecentListJSON, messageJSON = data;

  if (data.type == "customer-to-hotel") {
    
    hotel = {id: data.to.id, name: data.to.name};
    customer = {id: data.from.id, name: data.from.name};

  } else {
    
    hotel = {id: data.from.id, name: data.from.name};
    customer = {id: data.to.id, name: data.to.name};
  }

  hotelRecentListJSON = {id: customer.id, name: customer.name, message: data.message, timestamp: data.timestamp};
  userRecentListJSON = {id: hotel.id, name: hotel.name, message: data.message, timestamp: data.timestamp};

  redisClient.rpush(["conversation-"+hotel.id+"-"+customer.id, JSON.stringify(messageJSON)]);

  // --------------------------------- AGGIORNA LA LISTA HOTELS-RECENTI ---------------------------------
  redisClient.lrange("hotel_recent_users-"+hotel.id, 0, -1, function(err, reply) {

    var found = false;
    for (var i=0, n=reply.length; i<n; i++) {

      reply[i] = JSON.parse(reply[i]);
      if (reply[i].id == customer.id) {

        redisClient.lrem("hotel_recent_users-"+hotel.id, 1, JSON.stringify(reply[i]), function() {

          redisClient.lpush(["hotel_recent_users-"+hotel.id, JSON.stringify(hotelRecentListJSON)]);
        });

        found = true;
        i=n;
      }
    }

    if (!found)
      redisClient.lpush(["hotel_recent_users-"+hotel.id, JSON.stringify(hotelRecentListJSON)]);
  });
  
  // --------------------------------- AGGIORNA LA LISTA UTENTI-RECENTI ---------------------------------
  redisClient.lrange("user_recent_hotels-"+customer.id, 0, -1, function(err, reply) {

    var found = false;
    for (var i=0, n=reply.length; i<n; i++) {
      
      reply[i] = JSON.parse(reply[i]);
      if (reply[i].id == hotel.id) {

        redisClient.lrem("user_recent_hotels-"+customer.id, 0, JSON.stringify(reply[i]), function() {

          redisClient.lpush(["user_recent_hotels-"+customer.id, JSON.stringify(userRecentListJSON)]);
        });

        found = true;
        i=n;
      }
    }

    if (!found)
      redisClient.lpush(["user_recent_hotels-"+customer.id, JSON.stringify(userRecentListJSON)]);
  });

  // INOLTRA IL MESSAGGIO AGLI HOTEL (tab aperte)
  for (var i=0, n=hotelsList.length; i<n; i++) 
    if (hotelsList[i].id == hotel.id) {

      for (var j=0, m=hotelsList[i].socket.length; j<m; j++)
        io.sockets.connected[hotelsList[i].socket[j]].emit('receive', messageJSON);
      i=n;
    }

  // INVIARE IL MESSAGGIO ANCHE AI CLIENT (tab aperte)
  for (var i=0, n=customersList.length; i<n; i++) 
    if (customersList[i].id == customer.id) {

      for (var j=0, m=customersList[i].socket.length; j<m; j++)
        io.sockets.connected[customersList[i].socket[j]].emit('receive', messageJSON);
      i=n;
    }

}