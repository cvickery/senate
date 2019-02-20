// $Id: rollover_seats.js,v 1.1 2009/12/31 05:09:31 vickery Exp vickery $
/*
 *		Implements the Rollover Seats button on rollover_seats.xhtml by doing the
 *    AJAX thing with rollover_seats.php.
 *
 *		$Log: rollover_seats.js,v $
 *		Revision 1.1  2009/12/31 05:09:31  vickery
 *		Initial revision
 *
 *
 */
 	(	function()
		{
			var electionDate = null;
			var requestObject = null;
			function ajaxListener()
			{
				if (requestObject.readyState === 4)
				{
					if (requestObject.status === 200)
					{
						var results = document.getElementById('results');
					  results.innerHTML = requestObject.responseText;
					}
					else
					{
						alert("Rollover Failed");
					}
				}
			}
			function clickListener(evt)
			{
				evt = evt ? evt : window.event;
				var date = Date.parse(electionDate.value);
				if (isNaN(date) || date < 0)
				{
					alert('"'+electionDate.value+'" is not a valid election date');
				}
				else
				{
					requestObject = new XMLHttpRequest();
					requestObject.open('POST', "scripts/rollover_seats.php", true);
					requestObject.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
					requestObject.onreadystatechange = ajaxListener;
					requestObject.send('election-date='+electionDate.value);
				}
			}
			window.onload = function()
			{
				electionDate = document.getElementById('election-date-input');
				var rolloverButton = document.getElementById('rollover-button');
				if (typeof rolloverButton.addEventListener === "function")
				{
				  rolloverButton.addEventListener('click', clickListener, false);
				}
				else alert("browser support not implemented");
			};
		}
	)();