function Slashbot(config){
	this.playersMap = {};
	this.turnModes = ["random", "roundRobin"];
	this.turnMode = 0;
	this.lastTurn = 0;
	this.players = new Array();
	this.currentStoryFragments = [];
	this.config = config;
	this.connector = new config.connector(config);
	this.persistence = new config.persistence(config);
}

module.exports = Slashbot;

Slashbot.prototype = {
	start: function(){
		this.persistence.init();
		this.connector.init(this);
	},
	channelJoined: function(channel, who){
		if (who === this.config.botName)
			return;
		this.say(who, who + ", welcome to the channel. I am teh slashbot, I can tell you the [story so far], or the [latest] part. To add something to the story start your message with [story:] without the brackets. Have fun!");
		if (!this.playersMap[who]){
			console.log("pushing ", who);
			this.players.push(who);		
		}
	},
	message: function(from, to, text){
		if (!text)
			return;
		if (text.indexOf("story:") == 0){
			var storyText = text.substring("story:".length);
			this._addStoryPart(from, storyText);
		} else if (text.indexOf("correct:") == 0){
			var storyText = text.substring("correct:".length);
			this._correctStoryPart(from, storyText);
		} else if (text.indexOf("bot") == 0){
			if (text.indexOf("introduce yourself") > -1){
				this._introduce(from);
			} else if (text.indexOf("help") > -1){
				this._help(from);
			} else if (text.indexOf("joke") > -1){
				this._joke();
			} else	if (text.indexOf("creator") > -1){
				this._creator();
			} else if (text.indexOf("latest") > -1){
				this._latest(from);
			} else if (text.indexOf("story so far") > -1){
				this._fullStory(from);
			} else if (text.indexOf("new story") > -1){
				this._newStory(text);
			} else if (text.indexOf("set story") > -1){
				this._setStory(text);
			} else if (text.indexOf("list stories") > -1){
				this._listStories();
			} else if (text.indexOf("share the story") > -1){
				this._fullStory(false);
			} else if (text.indexOf("next turn") > -1){
				this._nextTurn();
			} else if (text.indexOf("turn mode") > -1){
				this._changeTurnMode();
			} else if (text.indexOf("dice") > -1 || text.indexOf("throw") > -1){
				this._dice(from, text);
			}else {
				this._wtf(from);
			}	
		}
	},
	registerPlayers: function(players){
		console.log("players in channel: ", players);
		console.log(players.length);
		for (var i = 0; i < players.length; i++) {
			// console.log(i);
			if (!this.playersMap[players[i]] && players[i] != this.config.botName) {
				console.log("pushing "+ i + ' ' + players[i]);
				this.players.push(players[i]);
			}
		}
	},
	_dice: function (from, text){
		var dieNotation = /(\d+)?d(\d+)([+-]\d+)?$/.exec(text);
	    if (!dieNotation) {
	        this.share("What's wrong with you, "+ from+ "? This is crap: " + text);
	    }
	    var amount = (typeof dieNotation[1] == 'undefined') ? 1 : parseInt(dieNotation[1]);
	    var faces = parseInt(dieNotation[2]);
	    var mods = (typeof dieNotation[3] == 'undefined') ? 0 : parseInt(dieNotation[3]);
		var diceArray = [];
		var sum = 0;
		for(var i = 0; i < amount; i++) {
			var die = Math.floor(Math.random() * faces) + 1;
			diceArray.push(die);
			sum += die;
		}
		this.share("Throw = ["+diceArray+"], Avg = "+sum/amount+" Total+mods = "+(sum+mods));
	},
	_introduce: function (){
		this.share("I am the slashbotx, I can tell you the [story so far], or the [latest] part. If you want to add something to the story, be sure to start your message with [story:] without the brackets. Have fun!");
	},
	_nextTurn: function(){
		var playerIndex = 0;
		var turnMode = this.turnModes[this.turnMode]; 
		if(turnMode === 'roundRobin'){
			playerIndex = this.lastTurn;
			this.lastTurn++;
			this.share(turnMode+": I suggest @"+this.players[playerIndex]+" goes next." + playerIndex);
			if (this.lastTurn >= this.players.length) {
				this.lastTurn = 0;
				this.share("Round complete.");
			}
		} else if (turnMode === 'random'){
			playerIndex = Math.floor(Math.random() * this.players.length);
			this.share(turnMode+": I suggest @"+this.players[this.playerIndex]+" goes next.");
		}
	},
	_changeTurnMode: function(){
		this.turnMode++;
		if(this.turnMode == this.turnModes.length)
			this.turnMode = 0;
		this.share("New turn mode: " + this.turnModes[this.turnMode] + ".");
	},
	_joke: function(){
		this.share("This is no time for jokes, my friend.");
	},
	_creator: function(){
		this.share("I am being created by the slashbot dev team at https://github.com/slashman/slashbot . Join if you will.");
	},
	_latest: function(who){
		if (this.currentStoryFragments.length == 0){
			this.say(who, "The current story has not begun");
			return;
		}
		var storypart = this.currentStoryFragments[this.currentStoryFragments.length-1];
		this.say(who, "Latest part of the story was from "+storypart.author+", he added: \""+storypart.story+"\"");
	},
	_fullStory: function(who){
		if (this.currentStoryFragments.length == 0){
			if (!who){
				this.share("The current story has not begun");
			} else {
				this.say(who, "The current story has not begun");
			}
			return;
		}
		if (!who){
			this.share("This is the story so far:");
		}
		for (var i = 0; i < this.currentStoryFragments.length; i++){
			var storypart = this.currentStoryFragments[i];
			if (!who){
				this.share(storypart.story);
			} else {
				this.say(who, storypart.story);
			}
		}
	},
	_wtf: function(who){
		this.share("Perhaps you need to rephrase... Or add behavior at: https://github.com/slashman/slashbot");
	},
	_addStoryPart: function (from, storyText){
		if (!this.story){
			this.say(from, "There's no story yet, you can ask me to create one using \"new story\"");
			return;
		}
		var storypart = {
			author: from,
			story: storyText
		};
		this.currentStoryFragments.push(storypart);	
		this._saveStory();	
		this.say(from, "Added.");
	},
	_correctStoryPart: function (from, storyText){
		if (this.currentStoryFragments.length == 0){
			this.say(from, "The current story is empty.");
			return;
		}
		var storypart = this.currentStoryFragments[this.currentStoryFragments.length-1];
		if (storypart.author === from){
			storypart = {
				author: from,
				story: storyText
			};
			this.currentStoryFragments[this.currentStoryFragments.length-1] = storypart;
			this._saveStory();
			this.say(from, "Corrected.");
		} else {
			this.say(from, "Sorry, only "+storypart.author+" can correct his fragment.");
		}
	}, 
	_help: function (who){
		this.say(who, "[story:] Adds a new fragment to the story");
		this.say(who, "[correct:] Corrects the last fragment of the story");
		this.say(who, "[latest] Gets the latest fragment");
		this.say(who, "[story so far] Gets the complete story.");
		this.say(who, "[next turn] Suggest who should do the next turn.");
		this.say(who, "[share the story] Shows the full store for everyone.");	
	},
	say: function(who, text){
		this.connector.say(who, text);
	},
	share: function(text){
		this.connector.share(text);
	},
	_newStory: function(text){
		var storyName = text.substr(text.indexOf("new story")+"new story".length+1);
		if (!storyName || storyName.trim() === ''){
			this.share('I need a name for the story');
			return;
		}
		this.story = this.persistence.createStory(storyName);
		this.share('Let\'s create the story "'+this.story.name+'"');
		this.currentStoryFragments = this.story.fragments;
	},
	_setStory: function (text){
		var storyPIN = text.substr(text.indexOf("set story")+"set story".length+1);
		if (!storyPIN || storyPIN.trim() === ''){
			this.share('I need a PIN for the story');
			return;
		}
		this.story = this.persistence.getStory(storyPIN);
		if (!this.story){
			this.share('I don\'t know a story with PIN ('+storyPIN+')');
			return;
		}
		this.share('Let\'s continue the story "'+this.story.name+'"');
		this.currentStoryFragments = this.story.fragments;
	},
	_listStories: function (text){
		var stories = this.persistence.getStoriesList();
		if (!stories || stories.length == 0){
			this.share('I know no stories.');
			return;
		}
		this.share('I know these stories:');
		for (var i = 0; i < stories.length; i++){
			var story = stories[i];
			this.share(story.pin+" - "+story.name);
		}
	},
	_saveStory: function(){
		this.persistence.saveStory(this.story);
	}
}