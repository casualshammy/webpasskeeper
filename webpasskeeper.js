var login;
var password;
var timeShutdown;
var db;

(function($) {
	$.QueryString = (function(paramsArray) {
		let params = {};

		for (let i = 0; i < paramsArray.length; ++i)
		{
			let param = paramsArray[i].split('=', 2);

			if (param.length !== 2)
				continue;

			params[param[0]] = decodeURIComponent(param[1].replace(/\+/g, " "));
		}

		return params;
	})(window.location.search.substr(1).split('&'))
})(jQuery);

function copyTextToClipboard(text) {
  if (!navigator.clipboard) {
	console.error('Async clipboard is not available');
	return;
  }
  navigator.clipboard.writeText(text);
}

function download(filename, text) {
    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    pom.setAttribute('download', filename);

    if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    }
    else {
        pom.click();
    }
}

function encryptData(dataAsString, password) {
	var encrypted = CryptoJS.AES.encrypt(dataAsString, password);
	var obj = {
		ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
		iv: encrypted.iv.toString(),
		salt: encrypted.salt.toString()
	};
	return JSON.stringify(obj);
}

function decryptData(data, password) {
	var obj = JSON.parse(data);
	var cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Base64.parse(obj.ciphertext),
	  iv: CryptoJS.enc.Hex.parse(obj.iv),
	  salt: CryptoJS.enc.Hex.parse(obj.salt)
    });
	var decrypted = CryptoJS.AES.decrypt(cipherParams, password);
	return decrypted.toString(CryptoJS.enc.Utf8);
}

function getEntriesFromServer(func, errFunc) {
	$.ajax({ 
		url: "webpasskeeper.php",
		async: false,
		method: "POST",
		data: { method: "get", login: login, hashed_password: CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex) },
		dataType: "text",
		statusCode: {
		    403: function() {
		    	alert("Incorrect credentials");
		    	errFunc();
		    },
		    404: function() {
		    	alert("User is not found or credentials is not valid");
		    	errFunc();
		    },
		},
		success: function(data) {
			var decryptedData = decryptData(data, password);
			if (decryptedData != "") {
				var obj = JSON.parse(decryptedData);
				db = obj;
				updateView();
				func();
			}
			else {
				alert("Decryption failed!");
				errFunc();
			}
		},
	});
}

function resetTimer() {
	timeShutdown = new Date().getTime() + 10 * 60 * 1000; // 10 min
	$("#search_form_legend").css('background-color','#00FF00');
	setTimeout(function() {
		$("#search_form_legend").css('background-color','#FFFFFF');
	}, 1000); // 1 sec
}

function updateView() {
	var result = "<table border=\"1\"><tr><th>Entry</th><th>Login</th><th>Password</th></tr>";
	var searchtext = $("#txtbox_search").val();
	for (var i in db.data) {
		if (searchtext != "") {
			if (i.includes(searchtext)) {
				result += `<tr><th><a href='#' onclick=\"copyTextToClipboard('${i}');resetTimer();return false;\">${i}</a></th><th><a href='#' onclick=\"copyTextToClipboard('${db.data[i].login}');resetTimer();return false;\">${db.data[i].login}</a></th><th><a href='#' onclick=\"copyTextToClipboard('${db.data[i].password}');resetTimer();return false;\">${db.data[i].password}</a></th></tr>`;
			}
		}
		else {
			result += `<tr><th><a href='#' onclick=\"copyTextToClipboard('${i}');resetTimer();return false;\">${i}</a></th><th><a href='#' onclick=\"copyTextToClipboard('${db.data[i].login}');resetTimer();return false;\">${db.data[i].login}</a></th><th><a href='#' onclick=\"copyTextToClipboard('${db.data[i].password}');resetTimer();return false;\">${db.data[i].password}</a></th></tr>`;
		}
	}
	result += "</table>";
	$("#div_login").html(result);
}

function sendDataToServer() {
	if (db != null) {
		var dbJson = JSON.stringify(db);
		var dbJsonEncrypted = encryptData(dbJson, password);
		$.post("webpasskeeper.php", { 
			method: "store", 
			login: login, 
			hashed_password: CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex), 
			data: dbJsonEncrypted 
		});
	}
}

function registerNewUser(login, password, func) {
	$.ajax({ 
		url: "webpasskeeper.php",
		async: false,
		method: "POST",
		data: { method: "register", login: login, hashed_password: CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex) },
		dataType: "text",
		statusCode: {
		    403: function() {
		    	alert("Please enter credentials");
		    },
		    402: function() {
		    	alert("You cannot register with these credentials");
		    },
		},
		success: func,
	});
}

function initDB() {
	return {
		"data-modified": Math.floor(Date.now() / 1000),
		"login": login,
		"data": { },
	};
}

function enableControls() {
	$("#div_main").css("display", "inline");
	$('#txtbox_search').focus();
	$('#txtbox_search').on('input', updateView);
	
	// reset timeout timer
	$('#txtbox_search').on('input', resetTimer);
	$('#txtbox_modify_entry_name').on('input', resetTimer);
	$('#txtbox_modify_entry_login').on('input', resetTimer);
	$('#txtbox_modify_entry_password').on('input', resetTimer);
	
	StartAutoLogoutTimer();
}

function OnLoginOrRegisterClick(e) {
	e.preventDefault();
	DisableEnterKey();
	login = $("#login").val();
	password = $("#password").val();
}

// set register button
$(document).ready(function() {
	$("#register_new_user").click(function(e) {
		OnLoginOrRegisterClick(e);
		registerNewUser(login, password, function(data) {
			alert("User successfully registered");
			db = initDB();
			sendDataToServer();
			updateView();
			enableControls();
		});
	})
});

//set login button
$(document).ready(function() {
	$("#submit_login_data").click(function(e) {
		OnLoginOrRegisterClick(e);
		getEntriesFromServer(enableControls,
		function() {
//			$("#div_main").html("");
		});
	})
});

//set import btn
$(document).ready(function() {
	$("#btn_import").click(function(e) {
		e.preventDefault();
		$("#importExportDiv").css("display", "inline");
	});
	document.getElementById("importExportDiv").addEventListener("paste", handlePaste);
});
function handlePaste(e) {
    var clipboardData, pastedData;
    // Stop data actually being pasted into div
    e.stopPropagation();
    e.preventDefault();
    // Get pasted data via clipboard API
    clipboardData = e.clipboardData || window.clipboardData;
    pastedData = clipboardData.getData('Text');
    // Do whatever with pasteddata
    var obj = JSON.parse(pastedData);
    for (var i in obj) {
    	db.data[i] = {
    			"login": obj[i].login,
				"password": obj[i].password,
				"date_updated": Math.floor(Date.now() / 1000),
    	};
	}
    db["data-modified"] = Math.floor(Date.now() / 1000);
    sendDataToServer();
    alert("Import is completed successfully");
    $("#importExportDiv").css("display", "none");
    updateView();
}

//set export btn
$(document).ready(function() {
	$("#btn_export").click(function(e) {
		e.preventDefault();
		download("credentials.json", JSON.stringify(db.data));
	});
});

//add/modify button logic
$(document).ready(function() {
	$("#btn_modify_entry").click(function(e) {
		e.preventDefault();
		var entryName = $("#txtbox_modify_entry_name").val();
		var entryLogin = $("#txtbox_modify_entry_login").val();
		var entryPassword = $("#txtbox_modify_entry_password").val();
		if (entryLogin == "" && entryPassword == "") {
			delete db.data[entryName];
		}
		else {
			db.data[entryName] = {
					"login": entryLogin,
					"password": entryPassword,
					"date_updated": Math.floor(Date.now() / 1000),
			};
		}
		db["data-modified"] = Math.floor(Date.now() / 1000);
		sendDataToServer();
		alert("Entry with name '" + $("#txtbox_modify_entry_name").val() + "' is added/modified");
		$('#txtbox_search').trigger('input');
	});
});

function DisableEnterKey() {
	$(document).keypress(function(event) {
		if (event.which == '13') {
			event.preventDefault();
		}
	});
}
			
function StartAutoLogoutTimer() {
	resetTimer();
	setInterval(function() {
		var distance = timeShutdown - new Date().getTime();
		var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
		var seconds = Math.floor((distance % (1000 * 60)) / 1000);
		$("#search_form_legend").html("Management | Time to session end: " + minutes + "m " + seconds + "s");
		if (distance <= 0 && (login !== null || password !== null || db !== null)) {
			$("#div_main").html("<strong>Your session has been automatically ended</strong>");
			$("#div_login").html("");
			login = null;
			password = null;
			db = null;
		}
	}, 1000);
}

// setup login if it is passed in query string
$(document).ready(function() {
	if ($.QueryString["file"] != null && $.QueryString["file"] != "") {
		$("#login").val($.QueryString["file"]);
		$("#password").focus();
	}
	else {
		$("#login").focus();
	}
});
