var socket;
var Messenger;

function chatController() {

	Messenger = (function() {

		var chatContainer;
		var historyMessageTimes = [];
		var messageContainer = document.getElementsByClassName("conversation-container")[0];
		var usersListContainer = document.getElementsByClassName("users-list")[0];
	  var usersList = usersListContainer.getElementsByTagName("ul")[0].getElementsByTagName("li");


		var constructor = function(dataJSON) {

			usersListContainer.style.height = window.innerHeight+"px"; 
		  messageContainer.style.height = (750)+"px"; 
		  messageContainer.style.width = (window.innerWidth-351)+"px"; 

		  window.addEventListener("resize", function(){

				usersListContainer.style.height = window.innerHeight+"px"; 
			  messageContainer.style.height = (window.innerHeight-50)+"px"; 
			  messageContainer.style.width = (window.innerWidth-351)+"px"; 
		  });
			socket.emit('get-hotels-list', {customer_id: getCookie("customer_id")});
			socket.on('get-hotels-list', function(data){

		  	createUsersList(data);
			});
		}

		var getChatContainer = function(dataJSON) {

			var container = document.getElementById("conversation-"+dataJSON.id);

			if (!container) {
				container = createChatContainer(dataJSON);
				return container;
			}
			
			if (typeof dataJSON.message != "undefined")
				appendMessage(dataJSON);

			return container;
		}
		
		var createChatContainer = function(dataJSON) {

			historyMessageTimes[dataJSON.id] = 0;

			var container = document.createElement("div");
			container.id = "conversation-"+dataJSON.id;
			container.style.width = (window.innerWidth-351)+"px";
			container.classList.add("conversation");
			container.classList.add("fade-out");

			var header = document.createElement("header");
			header.style.width = (window.innerWidth-351)+"px";
			var h1 = document.createElement("h1");
			h1.innerHTML = dataJSON.name;
			header.appendChild(h1);

			var section = document.createElement("section");
			section.classList.add("messages-container");
			section.style.width = (window.innerWidth-351)+"px";
			section.style.height = (window.innerHeight-102-55)+"px";
			section.addEventListener("click", function() {

				container.getElementsByTagName("input")[0].focus();
			});

			var footer = document.createElement("footer");
			footer.style.width = (window.innerWidth-351)+"px";
			footer.classList.add("bottom-bar");
			
			var input = document.createElement("input");
			input.id = "text-message";
			input.setAttribute("type", "text");
			input.setAttribute("placeholder", "Scrivi qualcosa...");

		  input.addEventListener("keyup", function(e){

		    if (e.keyCode == 13 && this.value.trim() != "") {

					// MANTIENE LA STRUTTURA dati CON CUI HA CREATO LA FINESTRA, QUELLA CON TUTTI I CAMPI
		  		sendMessage({id: dataJSON.id, name: dataJSON.name, message: this.value.trim()});
  				input.value = "";
		  	}
		  });

			container.appendChild(header);
			container.appendChild(section);
			container.appendChild(footer);
			footer.appendChild(input);

			container.style.height = (window.innerHeight-55)+"px"; 
			container.getElementsByClassName("bottom-bar")[0].style.width = (window.innerWidth-351)+"px";
			
			messageContainer.appendChild(container);

			if (typeof dataJSON.message != "undefined")
				appendMessage(dataJSON);

			return container;
		}

		var getHistoryMessage = function(dataJSON) {

	  	var container = document.getElementById("conversation-"+dataJSON.id).getElementsByClassName("messages-container")[0];

			// GET HISTORY MESSAGE
			socket.emit('get-history-conversation', {type: "customer", from:getCookie("customer_id"), id_conversation: dataJSON.id+"-"+getCookie("customer_id"), time: historyMessageTimes[dataJSON.id]});
			socket.on('receive-history-conversation', function(data){

				var hotelID;

				for (var i=data.length-1, n=0; i>=n; i--) {

					data[i] = JSON.parse(data[i]);

					if (data[i].type == "customer-to-hotel")
						prependMessage({type: data[i].type, id: data[i].to.id, name: data[i].to.name, message: data[i].message, timestamp: data[i].timestamp});
					else
						prependMessage({type: data[i].type, id: data[i].from.id, name: data[i].from.name, message: data[i].message, timestamp: data[i].timestamp});
				}

				if (data[0]) {

					if (data[0].type == "customer-to-hotel")
						hotelID = data[0].to.id;
					else
						hotelID = data[0].from.id;

					if (historyMessageTimes[hotelID] < 0)
		  			container.scrollTo(0, container.scrollHeight);
		  		else
		  			container.scrollTo(0, 20);

					historyMessageTimes[hotelID]++;
				}

			});
		}

		var receive = function(dataJSON) {

			updateUsersList(dataJSON);
			getChatContainer(dataJSON);
		}

		var sendMessage = function(dataJSON) {


			var messageJSON = {
				type: "customer-to-hotel", 
				from: {
					id: getCookie("customer_id"), 
					name: (getCookie("customer_first_name")+" "+getCookie("customer_last_name")).split("+").join(" ")
				},
				to: {
					id: dataJSON.id, 
					name: dataJSON.name
				},
				message: dataJSON.message,
				timestamp: getDate()
			};

			socket.emit('send', messageJSON);
		}

		var appendMessage = function(dataJSON) {


			var container = document.getElementById("conversation-"+dataJSON.id).getElementsByClassName("messages-container")[0];

			var message = document.createElement("div");
			message.classList.add("message");

			if (dataJSON.type == "customer-to-hotel")
				message.classList.add("sent");
			else
				message.classList.add("received");
			
			var content = document.createElement("div");
			content.classList.add("content");
			content.innerHTML = dataJSON.message;
			message.appendChild(content);

			container.appendChild(message);
	  	container.scrollTo(0, container.scrollHeight);
		}

		var prependMessage = function(dataJSON) {
		

			var container = document.getElementById("conversation-"+dataJSON.id).getElementsByClassName("messages-container")[0];
			
			var message = document.createElement("div");
			message.classList.add("message");

			if (dataJSON.type == "customer-to-hotel")
				message.classList.add("sent");
			else
				message.classList.add("received");
			
			var content = document.createElement("div");
			content.classList.add("content");
			content.innerHTML = dataJSON.message;
			message.appendChild(content);

	  	var firstMessage = container.getElementsByClassName("message")[0];

	  	if (typeof firstMessage != "undefined")
	  		firstMessage.parentNode.insertBefore(message, firstMessage);
	  	else
				container.appendChild(message);
		}
		
		var createUsersList = function(dataJSON) {
		

			for (var i=0, n=dataJSON.length; i<n; i++)
				document.getElementsByClassName("users-list")[0].getElementsByTagName("ul")[0].appendChild(createItemUsersList(JSON.parse(dataJSON[i])));		
		}
		
		var createItemUsersList = function(dataJSON) {

			
			var item = document.createElement("li");
			item.classList.add("item-list-customer-"+dataJSON.id);
			item.setAttribute("data-user-id", dataJSON.id);

			var name = document.createElement("div");
			name.classList.add("name");
			name.innerHTML = dataJSON.name;	
			item.appendChild(name);

			var hour = document.createElement("div");
			hour.classList.add("hour");
			hour.innerHTML = dataJSON.timestamp.substr(11, 5);
			item.appendChild(hour);

			var message = document.createElement("div");
			message.classList.add("message");
			message.innerHTML = dataJSON.message;
			item.appendChild(message);

			item.addEventListener("click", function(){

				this.classList.remove("incoming");

				var allConversation = messageContainer.getElementsByClassName("conversation");
				for (var i=0, n=allConversation.length; i<n; i++)
					allConversation[i].classList.remove("fade-in");

				var chatContainer = getChatContainer({id: dataJSON.id, name: dataJSON.name});

				if (historyMessageTimes[dataJSON.id] < 1)
					getHistoryMessage({id: dataJSON.id});

				chatContainer.classList.add("fade-in");
			});

			return item;
		}

		var updateUsersList = function(dataJSON) {
		
			var currentItem = document.getElementsByClassName("item-list-customer-"+dataJSON.id)[0]
	  	var item = createItemUsersList(dataJSON);
			item.classList.add("incoming");
	  	
	  	var i=0, numUser=usersList.length;

	  	if (usersList.length > 0) {

	  		if (currentItem)
	  			usersList[0].parentNode.removeChild(currentItem);
	  	
	  		if (usersList.length > 0) {

	  			// LISTA INIZIALE CON ALMENO 3 UTENTI
		  		usersList[0].parentNode.insertBefore(item, usersList[0]);
		  		return false;

	  		} else {

	  			// LISTA INIZIALE CON SOLO 2 UTENTE
	  			createUsersList([JSON.stringify(dataJSON)]);
		  		return false;
	  		}
	  	}

	  	// LISTA INIZIALE VUOTA
	  	createUsersList([JSON.stringify(dataJSON)]);
		}

		return {

			init: constructor,
			receiveMessage: receive
		};

	})();

	Messenger.init();
}

function startChat(dataJSON) {

  socket = io();
  socket.emit('subscribe', {type: "customer", id: dataJSON.id});
  socket.on('receive', function(data){

  	var dataJSON;

  	if (data.type == "customer-to-hotel")	
  		dataJSON = {
				type: data.type, 
				id: data.to.id, 
				name: data.to.name, 
				message: data.message, 
				timestamp: data.timestamp
    	};
    else 
  		dataJSON = {
				type: data.type, 
				id: data.from.id, 
				name: data.from.name, 
				message: data.message, 
				timestamp: data.timestamp
    	};

  	if (location.href != absolutePath+"messaggi/")
		  chatPopup.receiveMessage(dataJSON);
		 else
		 	Messenger.receiveMessage(dataJSON);
  });
}

chatPopup = (function() {

	var chatPopup;
	var width = 280, marginRightChat = 20, marginRightWindows = 70;
	var bodyHMTL = document.getElementsByTagName("body")[0];
	var historyMessageTimes = [];

	var constructor = function() {

	}

	var getChatPopup = function(dataJSON) {

		var container = document.getElementById("conversation-"+dataJSON.id);

		if (!container) {
			
			container = createChatPopup(dataJSON);
			return container;
		}

		if (typeof dataJSON.message != "undefined")
			appendMessage(dataJSON);

		container.classList.add("fade-in");
		container.getElementsByTagName("input")[0].focus();

		return container;
	}

	var createChatPopup = function(dataJSON) {

		historyMessageTimes[dataJSON.id] = 0;

		var container = document.createElement("div");
		container.id = "conversation-"+dataJSON.id;
		container.classList.add("chat-panel");
		container.classList.add("fade-out");
		container.style.right = (width*document.getElementsByClassName("chat-panel").length)+marginRightWindows+"px";
		container.style.marginRight = (marginRightChat*document.getElementsByClassName("chat-panel").length)+"px";

		var headerChatPanel = document.createElement("header");
		var h1HeaderChatPanel = document.createElement("h1");
		h1HeaderChatPanel.classList.add("left");
		var anchorH1HeaderChatPanel = document.createElement("a");
		anchorH1HeaderChatPanel.classList.add("underline-hover");
		anchorH1HeaderChatPanel.innerHTML = dataJSON.name;
		anchorH1HeaderChatPanel.setAttribute("href", absolutePath+"hotel/"+dataJSON.id);
		var buttonCloseChatPanel = document.createElement("button");
		buttonCloseChatPanel.classList.add("right");
		buttonCloseChatPanel.classList.add("close");
		buttonCloseChatPanel.addEventListener("click", function(){

			container.remove();

			for (var i=0, n=document.getElementsByClassName("chat-panel").length; i<n; i++) {

				document.getElementsByClassName("chat-panel")[i].style.right = (width*i)+marginRightWindows+"px"
				document.getElementsByClassName("chat-panel")[i].style.marginRight = (marginRightChat*i)+"px";
			}
		});
		var iconButtonCloseChatPanel = document.createElement("i");
		iconButtonCloseChatPanel.classList.add("material-icons");
		iconButtonCloseChatPanel.innerHTML = "close";
		h1HeaderChatPanel.appendChild(anchorH1HeaderChatPanel);
		buttonCloseChatPanel.appendChild(iconButtonCloseChatPanel);
		headerChatPanel.appendChild(buttonCloseChatPanel);
		headerChatPanel.appendChild(h1HeaderChatPanel);

		var sectionChatPanel = document.createElement("section");
		sectionChatPanel.classList.add("messages-container");
		sectionChatPanel.addEventListener("click", function(e){

			container.getElementsByTagName("input")[0].focus();
		});

		var footerChatPanel = document.createElement("footer");
		var inputFooterChatPanel = document.createElement("input");
		inputFooterChatPanel.setAttribute("type", "text");
		inputFooterChatPanel.setAttribute("placeholder", "Scrivi all'albergatore");
		inputFooterChatPanel.addEventListener("keyup", function(e){

	    if (e.keyCode == 13 && this.value.trim() != "") {

		  		sendMessage({id: dataJSON.id, name: dataJSON.name, message: this.value.trim()});
    		this.value = "";
	    }
		});
		footerChatPanel.appendChild(inputFooterChatPanel);

		container.appendChild(headerChatPanel);
		container.appendChild(sectionChatPanel);
		container.appendChild(footerChatPanel);

		container.classList.add("fade-in");
		bodyHMTL.appendChild(container);

		// GET HISTORY MESSAGE
		getHistoryMessage({id: dataJSON.id});
	}

	var getHistoryMessage = function(dataJSON) {


		// GET HISTORY MESSAGE
		socket.emit('get-history-conversation', {type: "customer", from:getCookie("customer_id"), id_conversation: dataJSON.id+"-"+getCookie("customer_id"), time: historyMessageTimes[dataJSON.id]});
		socket.on('receive-history-conversation', function(data){
		
  		var customerID;
  		var container;
		
			for (var i=data.length-1, n=0; i>=n; i--) {

				data[i] = JSON.parse(data[i]);

				if (data[i].type == "customer-to-hotel")
					prependMessage({type: data[i].type, id: data[i].to.id, name: data[i].to.name, message: data[i].message, timestamp: data[i].timestamp});
				else
					prependMessage({type: data[i].type, id: data[i].from.id, name: data[i].from.name, message: data[i].message, timestamp: data[i].timestamp});
			}

			if (data[0]) {

				if (data[0].type == "customer-to-hotel")
					customerID = data[0].to.id;
				else
					customerID = data[0].from.id;

				container = document.getElementById("conversation-"+customerID).getElementsByClassName("messages-container")[0];

				if (historyMessageTimes[customerID] < 1)
	  			container.scrollTo(0, container.scrollHeight);
	  		else
	  			container.scrollTo(0, 20);

				historyMessageTimes[customerID]++;
			}

		});

	}

	var receive = function(data) {

		getChatPopup(data);
	}

	var sendMessage = function(dataJSON) {

		var messageJSON = {
			type: "customer-to-hotel", 
			from: {
				id: getCookie("customer_id"),
				name: getCookie("customer_first_name")+" "+getCookie("customer_last_name")
			},
			to: {
				id: dataJSON.id, 
				name: dataJSON.name 
			},
			message: dataJSON.message,
			timestamp: getDate()
		};

		socket.emit('send', messageJSON);
	}

	var appendMessage = function(dataJSON) {

  	var container = document.getElementById("conversation-"+dataJSON.id).getElementsByTagName("section")[0];
		var message = document.createElement("div");
		message.classList.add("message");

		if (dataJSON.type == "customer-to-hotel")
			message.classList.add("sent");
		else
			message.classList.add("received");
		
		var content = document.createElement("div");
		content.classList.add("content");

		var span = document.createElement("span");
		span.classList.add("content");
		span.innerHTML = dataJSON.message;
		
		content.appendChild(span);
		message.appendChild(content);

		container.appendChild(message);
	  container.scrollTo(0, container.scrollHeight);
	}

	var prependMessage = function(dataJSON) {
	
  	var container = document.getElementById("conversation-"+dataJSON.id).getElementsByClassName("messages-container")[0];
		var message = document.createElement("div");
		message.classList.add("message");

		if (dataJSON.type == "customer-to-hotel")
			message.classList.add("sent");
		else
			message.classList.add("received");
		
		var content = document.createElement("div");
		content.classList.add("content");

		var span = document.createElement("span");
		span.classList.add("content");
		span.innerHTML = dataJSON.message;
		
		content.appendChild(span);
		message.appendChild(content);

  	var firstMessage = container.getElementsByClassName("message")[0];

  	if (typeof firstMessage != "undefined")
  		firstMessage.parentNode.insertBefore(message, firstMessage);
  	else
			container.appendChild(message);
	}

	return {

		init: constructor,
		open: getChatPopup,
		receiveMessage: receive
	};

})();

chatPopup.init();