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

function isNull(v) {
	return v === null || v === undefined;
}

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
		async: true,
		method: "POST",
		data: { method: "get", login: login, hashed_password: CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex) },
		dataType: "text",
		statusCode: {
		    403: function() {
		    	alert("Incorrect credentials");
				if (!isNull(errFunc)) errFunc();
		    },
		    404: function() {
		    	alert("User is not found or credentials is not valid");
		    	if (!isNull(errFunc)) errFunc();
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
				if (!isNull(errFunc)) errFunc();
			}
		},
	});
}

function resetTimer() {
	timeShutdown = new Date().getTime() + 10 * 60 * 1000; // 10 min
	$("#search_form_legend").html("Time to session end: 10m 0s");
}

function updateView() {
	var result = "<div class=\"row mb-4\"> <div class=\"col-4 themed-grid-col-strong\">Entry</div> <div class=\"col-4 themed-grid-col-strong\">Login</div> <div class=\"col-4 themed-grid-col-strong\">Password</div> </div>";
	var searchtext = $("#txtbox_search").val();
	for (var i in db.data) {
		if (searchtext != "") {
			if (i.includes(searchtext)) {
				result += 
				`<div class=\"row\"> 
					<div class=\"col-4 themed-grid-col\">
						<button type=\"button\" class=\"btn btn-info btn_cred\" onclick=\"copyTextToClipboard('${i}');resetTimer();$('#txtbox_modify_entry_name').val('${i}');\">${i}</button>
					</div>
					<div class=\"col-4 themed-grid-col\">
						<button type=\"button\" class=\"btn btn-info btn_cred\" onclick=\"copyTextToClipboard('${db.data[i].login}');resetTimer();\">${db.data[i].login}</button>
					</div>
					<div class=\"col-4 themed-grid-col\">
						<button type=\"button\" class=\"btn btn-info btn_cred\" onclick=\"copyTextToClipboard('${db.data[i].password}');resetTimer();\">${db.data[i].password}</button>
					</div>
				</div>`;
			}
		}
		else {
			result += 
			`<div class=\"row\"> 
				<div class=\"col-4 themed-grid-col\">
					<button type=\"button\" class=\"btn btn-info btn_cred\" onclick=\"copyTextToClipboard('${i}');resetTimer();$('#txtbox_modify_entry_name').val('${i}');\">${i}</button>
				</div>
				<div class=\"col-4 themed-grid-col\">
					<button type=\"button\" class=\"btn btn-info btn_cred\" onclick=\"copyTextToClipboard('${db.data[i].login}');resetTimer();\">${db.data[i].login}</button>
				</div>
				<div class=\"col-4 themed-grid-col\">
					<button type=\"button\" class=\"btn btn-info btn_cred\" onclick=\"copyTextToClipboard('${db.data[i].password}');resetTimer();\">${db.data[i].password}</button>
				</div>
			</div>`;
		}
	}
	// result += "</table>";
	$("#div_login").html(result);
	$("#form_login").hide();
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
	$("body").css("display", "block");
	$("body").css("text-align", "-webkit-center");
	
	// search_form text-align: -webkit-center;
	
	$('#txtbox_search').focus();
	$('#txtbox_search').on('input', updateView);
	
	// reset timeout timer
	$('#txtbox_search').on('input', resetTimer);
	$('#txtbox_modify_entry_name').on('input', resetTimer);
	$('#txtbox_modify_entry_login').on('input', resetTimer);
	$('#txtbox_modify_entry_password').on('input', resetTimer);
	
	DisableEnterKey();
	StartAutoLogoutTimer();
	StartSyncTimer();
}

function IsCredentialsValid() {
	return $("#login").val() !== "" && $("#password").val() !== "";
}

// set register button
$(document).ready(function() {
	$("#register_new_user").click(function(e) {
		if (IsCredentialsValid()) {
			login = $("#login").val();
			password = $("#password").val();
			e.preventDefault();
			DisableEnterKey();
			registerNewUser(login, password, function(data) {
				alert("User successfully registered");
				db = initDB();
				sendDataToServer();
				updateView();
				enableControls();
			});
		}
		else {
			alert("Login and password are mandatory fields.");
		}
	})
});

//set login button
$(document).ready(function() {
	$("#submit_login_data").click(function(e) {
		if (IsCredentialsValid()) {
			$("#spinner_login_btn").show();
			$("#text_login_btn").hide();
			$("#submit_login_data").prop('disabled', true);
			$("#register_new_user").prop('disabled', true);
			login = $("#login").val();
			password = $("#password").val();
			e.preventDefault();
			getEntriesFromServer(enableControls, function() {
				$("#text_login_btn").show();
				$("#spinner_login_btn").hide();
				$("#submit_login_data").prop('disabled', false);
				$("#register_new_user").prop('disabled', false);
			});
		}
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
		if (distance > 2 * 60 * 1000) {
			$("#search_form_legend").hide();
		}
		else {
			var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
			var seconds = Math.floor((distance % (1000 * 60)) / 1000);
			$("#search_form_legend").html("Time to session end: " + minutes + "m " + seconds + "s");
			$("#search_form_legend").show();
		}
		if (distance <= 0 && (login !== null || password !== null || db !== null)) {
			$("#div_main").html("<strong>Your session has been automatically ended</strong><br/><button type=\"button\" class=\"btn btn-info\" onclick=\"window.location.reload();\">Reload page</button>");
			$("#div_login").html("");
			login = null;
			password = null;
			db = null;
		}
	}, 1000);
}

function StartSyncTimer() {
	setInterval(function() {
		if (login !== null && password !== null) {
			$.ajax({ 
				url: "webpasskeeper.php",
				async: true,
				method: "POST",
				data: { method: "get-db-timestamp", login: login, hashed_password: CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex) },
				dataType: "text",
				statusCode: {
					403: function() {
						console.log("StartSyncTimer error", 403);
					},
					404: function() {
						console.log("StartSyncTimer error", 404);
					},
				},
				success: function(data) {
					console.log("StartSyncTimer", data);
				},
			});
		}
	}, 5000);
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
