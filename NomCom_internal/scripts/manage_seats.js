//  $Id: manage_seats.js,v 1.10 2010/09/04 21:59:37 vickery Exp vickery $

/*
 *  Click on a seat-holder to change the status of a seat.
 *
 *  $Log: manage_seats.js,v $
 *  Revision 1.10  2010/09/04 21:59:37  vickery
 *  Bug fix: pro-tem or regular seat holder choice was always being displayed,
 *  even when there was not pro-tem seat holder.
 *
 *  Revision 1.9  2010/08/31 04:24:25  vickery
 *  Bug fix in chair change caused by bad regex when trimming whitespace
 *  from the ends of lines. Don't do that.
 *
 *  Revision 1.8  2010/08/30 05:35:20  vickery
 *  Added support for resignation of either the regular or pro-tem
 *  seat holder when a seat has a pro-tem seat holder.
 *
 *  Revision 1.7  2010/04/11 04:09:37  vickery
 *  Added webkit support for arrow keys in the person-select list.
 *  Webkit generates only keyup events for arrow keys, which unforunatley
 *  means they do not auto-repeat. This revision uses keypressArrows, initially
 *  false, to signal when keypress events for arrow keys are detected and used;
 *  the keyup listener uses this global boolean to decide whether it should
 *  handle them or not.
 *
 *  Revision 1.6  2010/01/09 23:40:07  vickery
 *  Fixed string trimmer, which didn't actually do anything. Used string
 *  trimmer on the XMLHttpRequest.responseText when verifying events to
 *  fix a new bug in which the response text was coming back with a newline
 *  at the end.
 *
 *  Revision 1.5  2010/01/09 22:55:32  vickery
 *  Handle the various permutations of changing chairs without the current
 *  chair resigning from the committee: elect a new chair when there was none;
 *  chair resigns as chair but not from the committee; new chair elected to
 *  replace existing chair.
 *  Various global variable name changes to make code easier to understand.
 *
 *  Revision 1.4  2010/01/08 06:12:02  vickery
 *  Remove chair status and update committees table when the
 *  chair of a committee vacates a seat.
 *
 *  Revision 1.3  2009/11/09 06:15:16
 *  Minor changes (whitespace cleanup); changed the
 *  class value to person-id. Changes made at the time
 *  application was made to look more like the
 *  application.
 *
 *  Revision 1.2  2009/11/02 21:04:00
 *  Implemented renewals.
 *
 *  Revision 1.1  2009/11/02 00:51:17
 *  Initial
 *
 *
 */
if (typeof Core === 'undefined')
{
  alert('Core library is missing');
}
else
{
  Core.start
  (
    (function()
      {
        /*  allPersonsList is a list of person objects from the database: id, name, and is_faculty
         *  fields.
         *
         */
        var keypressArrows                = false;
        var xmlhttpreq                    = null;
        var requestObject                 = null;
        var allPersonsList                = [];
        var allPersonsIndex               = -1;

        var personSelectFieldset          = null;
        var thisPerson                    = null;
        var personForm                    = null;
        var personTextLabel               = null;
        var personText                    = null;

        var eventTypeFieldset             = null;
        var renewalRadioButton            = null;
        var proceduralRadioButton         = null;
        var graduationRadioButton         = null;
        var departureRadioButton          = null;
        var resignationRadioButton        = null;
        var newChairRadioButton           = null;
        var proTemRadioButton             = null;

        var proTemOrSeatHolderFieldset    = null;
        var proTemPersonRadioButton       = null;
        var seatHolderPersonRadioButton   = null;
        var proTemOrSeatHolderEventType   = null;
        var proTemPersonName              = null;
        var seatHolderPersonName          = null;

        var electionDateFieldset          = null;
        var electionDate                  = null;
        var vacancyDateFieldset           = null;
        var vacancyDatePromptLabel        = null;
        var vacancyDate                   = null;
        var proTemElectionDateFieldset    = null;
        var proTemElectionDate            = null;
        var proTemExpirationDateFieldset  = null;
        var proTemExpirationDate          = null;
        var proceduralCommentFieldset     = null;
        var proceduralComment             = null;

        var suggestionList                = null;
        var suggestionListItems           = [];
        var suggestionListIndex           = -1;

        //  These values get filled in when the user clicks on a seat.
        var seat_id                       = null;
        var is_faculty_seat               = null;
        var is_chair_seat                 = null;
        var currentSeatHolder             = null;
        var proTemSeatHolder              = null;
        var currentSeatHolderTextNode     = null;
        var currentChairTextNode          = null;
        var committee_name                = null;
        var eventType                     = null;

        //  verifyUpdate()
        //  ---------------------------------------------------------------------------------------
        /*  Verify that the seat got updated and update the table to reflect it.
         */
          function verifyUpdate()
          {
            if (xmlhttpreq.readyState === 4)
            {
              if (trim(xmlhttpreq.responseText) !== "OK")
              {
                alert("Update failed: " + xmlhttpreq.responseText);
              }
              else
              {
                switch (requestObject.event_type)
                {
                  case 'election':
                    currentSeatHolderTextNode.nodeValue = thisPerson.name;
                    Core.removeClass(currentSeatHolderTextNode.parentNode, 'person-id:1');
                    Core.addClass(currentSeatHolderTextNode.parentNode, 
                                                              'person-id:' + thisPerson.person_id);
                    currentSeatHolderTextNode.parentNode.setAttribute('title',
                                                         'Elected ' + requestObject.election_date);
                    break;
                  case 'renewal':
                    Core.addClass(currentSeatHolderTextNode.parentNode, 'renewal-received');
                    break;
                  case 'procedural':
                  case 'resignation':
                  case 'departure':
                  case 'graduation':
                    //  Have to check who resigned, and recreate what must have happened to the db
                    /*  person-id goes to 1 or to the id of the pro-tem holder
                     *  pro-tem-person-id definitely goes away
                     *  text node value goes to OPEN or to the name of the person who did not resign
                     */
                    if (proTemSeatHolder)
                    {
                      //  The pro-tem holder is either resigning or being made regular. In either
                      //  case, there is no longer a pro-tem holder.
                      Core.removeClass(currentSeatHolderTextNode.parentNode,           'pro-tem');
                      Core.removeClass(currentSeatHolderTextNode.parentNode,
                                                'pro-tem-person-id:' + proTemSeatHolder.person_id);
                      if (proTemSeatHolder.person_id === requestObject.person_id)
                      {
                        // The pro-tem holder resigned: revert to the regular holder
                        currentSeatHolderTextNode.nodeValue = currentSeatHolder.name;
                      }
                      else
                      {
                        //  The regular holder resigned: make the pro-tem holder the regular holder
                        Core.removeClass(currentSeatHolderTextNode.parentNode, 
                                                       'person-id:' + currentSeatHolder.person_id);
                        Core.addClass(currentSeatHolderTextNode.parentNode,
                                                        'person-id:' + proTemSeatHolder.person_id);
                        currentSeatHolderTextNode.nodeValue = proTemSeatHolder.name;
                      }
                    }
                    else
                    {
                      //  The regular holder resigned and there is no pro-tem: the seat is open
                      currentSeatHolderTextNode.nodeValue = 'OPEN';
                      Core.removeClass(currentSeatHolderTextNode.parentNode, 
                                                       'person-id:' + currentSeatHolder.person_id);
                      Core.addClass(currentSeatHolderTextNode.parentNode, 'person-id:1');
                      Core.removeClass(currentSeatHolderTextNode.parentNode, 'chair');
                      currentSeatHolderTextNode.parentNode.is_chair_seat = false;
                      currentSeatHolderTextNode.parentNode.setAttribute('title', 
                                                          'Vacated ' + requestObject.vacancy_date);
                    }
                    break;
                  case 'chair-change':
                    if (currentChairTextNode !== null)
                    {
                      Core.removeClass(currentChairTextNode.parentNode, 'chair');
                      currentChairTextNode.parentNode.is_chair_seat = false;
                      currentChairTextNode.nodeValue = /(.*) \(/.exec(currentChairTextNode.nodeValue)[1];
                    }
                    if (currentSeatHolderTextNode !== currentChairTextNode)
                    {
                      Core.addClass(currentSeatHolderTextNode.parentNode, 'chair');
                      currentSeatHolderTextNode.parentNode.is_chair_seat = true;
                      currentSeatHolderTextNode.nodeValue += ' (Chair)';
                    }
                    break;
                  case 'pro-tem':
                    currentSeatHolderTextNode.nodeValue = thisPerson.name;
                    Core.removeClass(currentSeatHolderTextNode.parentNode, 'person-id:' + currentSeatHolder.person_id);
                    Core.addClass(currentSeatHolderTextNode.parentNode, 'person-id:' + thisPerson.person_id);
                    currentSeatHolderTextNode.parentNode.setAttribute('title',
                        'Serving in place of ' + currentSeatHolder.name + ' until ' + requestObject.expiration_date);
                    break;
                  default:
                    break;
                }
              }
            }
          }

        //  updateSeat()
        //  ---------------------------------------------------------------------------------------
        /*  Update the database.
         *  The request object contains the info needed to create a new row in the seat_events table
         *  and to update a row in the seats or committees table.
         */
          function updateSeat()
          {
            requestObject = {};
            requestObject.seat_id = seat_id;
            requestObject.is_chair_seat = is_chair_seat;
            requestObject.committee_name = committee_name;
            requestObject.event_type = eventType;
            switch (eventType)
            {
              case 'renewal':
                requestObject.person_id = currentSeatHolder.person_id;
                requestObject.renewal_date = trim(vacancyDate.value);
                break;
              case 'election':
                requestObject.person_id = thisPerson.person_id;
                requestObject.election_date = trim(electionDate.value);
                break;
              case 'graduation':
              case 'departure':
              case 'resignation':
                requestObject.person_id = currentSeatHolder.person_id;
                if (proTemSeatHolder && proTemPersonRadioButton.checked)
                {
                  requestObject.person_id = proTemSeatHolder.person_id;
                }
                requestObject.vacancy_date  = trim(vacancyDate.value);
                break;
              case 'pro-tem':
                requestObject.person_id = thisPerson.person_id;
                requestObject.election_date = trim(proTemElectionDate.value);
                requestObject.expiration_date  = trim(proTemExpirationDate.value);
                break;
              case 'chair-change':
                requestObject.person_id = currentSeatHolder.person_id;
                break;
              case 'procedural':
                requestObject.person_id = currentSeatHolder.person_id;
                requestObject.vacancy_date = trim(vacancyDate.value);
                requestObject.comment = proceduralComment.value;
                break;
              default: throw new Error('Invalid eventType');
            }
            init_xmlhttpreq('scripts/update_seat.php?request='+JSON.stringify(requestObject), verifyUpdate);
          }

        //  resetPersonForm()
        //  ---------------------------------------------------------------------------------------
        /*  Hide the person form and the suggestion list; reset the related list indices.
         */
          function resetPersonForm()
          {
            personForm.style.visibility = 'hidden';
            suggestionList.style.visibility = 'hidden';
            personText.value = '';
            allPersonsIndex = -1;
            suggestionListIndex = -1;
          }

        //  initializeAllPersonsList()
        //  ---------------------------------------------------------------------------------------
        /*  XMLHttpRequest event handler.
         *  With the allPersonsList complete, make each table cell for seats clickable, and add a
         *  person object to each one.
         */
          function initializeAllPersonsList()
          {
            if (xmlhttpreq.readyState == 4)
            {
              allPersonsList = [];
              var people = JSON.parse(xmlhttpreq.responseText);
              for (person in people)
              {
                allPersonsList.push(people[person]);
              }
            }
            resetPersonForm();

            //  Now that we have the people, make seat-holder names clickable and associate the
            //  corresponding person object with each one.
            var seatCells                   = document.getElementsByTagName('td');
            for (cell in seatCells)
            {
              //  Operate on seat-holder table cells.
              if (Core.hasClass(seatCells[cell], 'seat-holder'))
              {
                Core.addEventListener(seatCells[cell], 'click', seatCellClickListener);

                // Find the person in the allPersons array, and put a reference to it in this td.
                var class_str = seatCells[cell].getAttribute('class');
                var person_id_str = /:(\d*?)( |$)/.exec(class_str);
                person_id_str = person_id_str[1];
                seatCells[cell].person = getPerson(person_id_str);
                //  Tag this td as a faculty|chair seat or not as the case may be.
                seatCells[cell].is_faculty_seat = /faculty-seat/.test(class_str);
                seatCells[cell].is_chair_seat = /chair/.test(class_str);
              }
            }
          }

        //  getPerson()
        //  ---------------------------------------------------------------------------------------
        /*  Given a person's ID, return the corresponding person from the allPersonsList.
         */
          function getPerson(person_id)
          {
            for (var i=0; i<allPersonsList.length; i++)
            {
              if (person_id === allPersonsList[i].person_id)
              {
                return allPersonsList[i];
              }
            }
            return null;
          }

        //  formatEventDialog()
        //  ---------------------------------------------------------------------------------------
        /*    Set up the structure of the event dialog box when the user clicks on a seat holder or
         *    one of the event type radio buttons.
         */
          function formatEventDialog(evt)
          {
            evt = evt ? evt : window.event;
            eventTypeFieldset.style.display             = 'none';
            personSelectFieldset.style.display          = 'none';
            electionDateFieldset.style.display          = 'none';
            vacancyDateFieldset.style.display           = 'none';
            proTemElectionDateFieldset.style.display    = 'none';
            proTemExpirationDateFieldset.style.display  = 'none';
            proTemOrSeatHolderFieldset.style.display    = 'none';
            proceduralCommentFieldset.style.display     = 'none';
            if (currentSeatHolder.person_id === '1')
            {
              //  Seat is currently open: this must be an election.
              personTextLabel.firstChild.nodeValue        =
                "Select the person elected to fill open seat " + seat_id + ':';
              personSelectFieldset.style.display          = 'block';
              electionDateFieldset.style.display          = 'block';
              personText.focus();
            }
            else
            {
              //  Seat is currently occupied: either a renewal was received, vacate it, set new
              //  chair, or name a pro-tem holder. 2010-08-27: or replace pro-tem holder with original holder.
              eventTypeFieldset.style.display             = 'block';

              if (renewalRadioButton.checked)
              {
                vacancyDatePromptLabel.firstChild.nodeValue =
                "When did " + currentSeatHolder.name + " submit a renewal application?";
                vacancyDateFieldset.style.display           = 'block';
              }
              //  Person vacated a seat by graduation, resignation, or departure from QC
              if ( graduationRadioButton.checked ||
                   departureRadioButton.checked  ||
                   resignationRadioButton.checked )
              {
                var thePerson = currentSeatHolder.name;
                if (proTemSeatHolder !== null)
                {
                  proTemPersonName.firstChild.nodeValue = proTemSeatHolder.name;
                  seatHolderPersonName.firstChild.nodeValue = currentSeatHolder.name;
                  proTemOrSeatHolderEventType.firstChild.nodeValue = (graduationRadioButton.checked ? 'graduated' :
                      (departureRadioButton.checked ? 'left QC' : 'resigned'));
                  proTemOrSeatHolderFieldset.style.display = 'block';
                  if (proTemPersonRadioButton.checked) { thePerson = proTemSeatHolder.name; }
                }
                else
                {
                  proTemOrSeatHolderFieldset.style.display = 'none';
                }
                var vacated_because = (graduationRadioButton.checked ? ' graduate?' :
                    (departureRadioButton.checked ? ' leave QC?' : ' resign?'));
                vacancyDatePromptLabel.firstChild.nodeValue =
                "When did " + thePerson + ' ' + vacated_because;
                vacancyDateFieldset.style.display           = 'block';
              }
              if (proTemRadioButton.checked)
              {
                personTextLabel.firstChild.nodeValue        =
                    "Who is the temporary replacement for " + currentSeatHolder.name + " on seat " + seat_id + '?';
                personSelectFieldset.style.display          = 'block';
                proTemElectionDateFieldset.style.display    = 'block';
                proTemExpirationDateFieldset.style.display  = 'block';
                personText.focus();
              }
              if (proceduralRadioButton.checked)
              {
                vacancyDatePromptLabel.firstChild.nodeValue = "Vacancy date?";
                vacancyDateFieldset.style.display           = 'block';
                proceduralCommentFieldset.style.display     = 'block';
              }
              // No further info needed if new chair option: no record is kept of when the new chair was
              // elected to that post.
            }
          }

        //  seatCellClickListener()
        //  ---------------------------------------------------------------------------------------
        /*  User clicked on a seatholder: capture info about the seat and current seat holder; set
         *  up dialog for finding out what to do.
         */
          function seatCellClickListener(evt)
          {
            evt = evt ? evt : window.event;

            currentSeatHolderTextNode       = this.firstChild;
            var thisRow                     = this.parentNode;
            var seatIdCell                  = thisRow.getElementsByTagName('td')[0];  // skip header col if present
            seat_id                         = seatIdCell.firstChild.nodeValue - 0;    // convert string to number
            is_faculty_seat                 = this.is_faculty_seat;
            is_chair_seat                   = this.is_chair_seat;
            var committeeTbodyNode          = thisRow.parentNode;
            committee_name                  = committeeTbodyNode.
                  getElementsByTagName('tr')[0].getElementsByTagName('th')[0].firstChild.nodeValue;
            currentChairTextNode            = null;
            var committee_seats             = committeeTbodyNode.getElementsByTagName('td');
            for (var i = 0; i < committee_seats.length; i++)
            {
              if (Core.hasClass(committee_seats[i], 'chair'))
              {
                currentChairTextNode = committee_seats[i].firstChild;
                break;
              }
            }
            //  In case seat person has changed, update the cell's person element.
            var class_str                   = this.getAttribute('class');

            var person_id_str               = /person-id:(\d*?)( |$)/.exec(class_str);
            person_id_str                   = person_id_str[1];
            this.person                     = getPerson(person_id_str);
            currentSeatHolder               = this.person;
            
            proTemSeatHolder                = null;
            var proTem_id_str               = /pro-tem-id:(\d*?)( |$)/.exec(class_str);
            if (proTem_id_str)
            {
              this.proTem_person            = getPerson(proTem_id_str[1]);
              proTemSeatHolder              = this.proTem_person;
            }
            graduationRadioButton.disabled  = this.person.is_faculty; //  Nice touch, Chris.
            formatEventDialog(evt);

            resetPersonForm();
            personForm.style.visibility = 'visible';
            personText.focus();
         }

        //  personSubmitListener()
        //  ---------------------------------------------------------------------------------------
        /*  Replacement person selected: update if valid.
         *  Selection can happen three ways:
         *  1.  Select person from suggestion list using keyboard: use suggestionListIndex.
         *  2.  Select person from suggestion list using mouse: use allPersonsIndex.
         *  3.  Type person's name correctly: find exact match in allPersonsList.
         *  4.  None of the above: complete and abject failure.
         */
          function personSubmitListener(evt)
          {
            evt = evt ? evt : window.event;
            thisPerson = null;
            if (suggestionListIndex !== -1)
            {
              thisPerson = allPersonsList[suggestionListItems[suggestionListIndex].allPersonsIndex];
            }
            else if (allPersonsIndex !== -1)
            {
              thisPerson = allPersonsList[allPersonsIndex];
            }
            else
            {
              for (var person in allPersonsList)
              {
                if (allPersonsList[person].name.toLowerCase() === personText.value.toLowerCase())
                {
                  thisPerson = allPersonsList[person];
                  break;
                }
              }
            }

            //  Determine type of event(s) and confirm data before doing the update.
            /*
             *    OPEN    -> Person   Election.
             *    Person  -> OPEN     Resignation, graduation, departure, or procedural.
             *                        Expiration: happens only during rollover.
             *    Person  -> Person   Different people:
             *                          Temporary replacement.
             *                            OR
             *                          Resignation, graduation, departure,
             *                          or procedural AND Election.
             *                        Same person: happens only during rollover when a person renews.
             *    Procedural removals need a comment explaining. the event.
             *    Temporary replacements need new person, election date, and termination date.
             */
            try
            {
              var confirmMsg = "Kindly confirm that ";
              if (currentSeatHolder.person_id === '1')
              {
                if (thisPerson)
                {
                  //  Simple date sanity check here: update_seat.php will check one-year interval.
                  if (Date.parse(electionDate.value) < Date.parse('January 1, 2009'))
                  {
                    throw new Error("Election date is not valid");
                  }
                  {
                    eventType = 'election';
                    confirmMsg += thisPerson.name + " (" + thisPerson.person_id
                            + (thisPerson.is_faculty ? " (faculty)" : "") +")";
                    confirmMsg += " was elected to fill vacant seat " + seat_id + " on " + 
                                                                          electionDate.value + ".";
                  }
                }
                else throw new Error("No Person Selected to fill open seat " + seat_id + ".");
              }
              else if (renewalRadioButton.checked)
              {
                if (Date.parse(vacancyDate.value) < Date.parse('January 1, 2009'))
                {
                  throw new Error("Application date is not valid.");
                }
                eventType = 'renewal';
                confirmMsg += currentSeatHolder.name + ' submitted a renewal application on ' + 
                                                                           vacancyDate.value + ".";
              }
              else if (graduationRadioButton.checked  || 
                       departureRadioButton.checked   || 
                       resignationRadioButton.checked)
              {
                if (Date.parse(vacancyDate.value) < Date.parse('January 1, 2009'))
                {
                  throw new Error("Vacancy date is not valid.");
                }
                eventType = graduationRadioButton.checked ? 'graduation' :
                                      (departureRadioButton.checked ? 'departure' : 'resignation');
                var personVacating = currentSeatHolder;
                var vacancyString = ' OPEN';
                if (proTemSeatHolder && proTemPersonRadioButton.checked)
                {
                  personVacating = proTemSeatHolder;
                  vacancyString = ' occupied by ' + currentSeatHolder.name;
                }
                if (proTemSeatHolder && seatHolderPersonRadioButton.checked)
                {
                  personVacating = currentSeatHolder;
                  vacancyString = ' occupied by ' + proTemSeatHolder.name;
                }
                confirmMsg += personVacating.name + " (" + personVacating.person_id + ")" +
                  (graduationRadioButton.checked ? " graduated on " :
                     (departureRadioButton.checked ? " left Queens College on " : " resigned on "))
                                 + vacancyDate.value + ", leaving seat " + seat_id + vacancyString;
              }
              else if (newChairRadioButton.checked)
              {
                eventType = 'chair-change';
                confirmMsg += currentSeatHolder.name + (is_chair_seat ? 
                      " resigned as chair of the " : " is the new chair of the ") + committee_name;
                if (currentChairTextNode !== null && 
                    (currentChairTextNode !== currentSeatHolderTextNode)
                   )
                {
                  var current_chair_name = currentChairTextNode.nodeValue;
                  current_chair_name = /(.*) \(/.exec(current_chair_name)[1];
                  confirmMsg += ", replacing " + current_chair_name + ".";
                }
                else confirmMsg += '.';
              }
              else if (proTemRadioButton.checked)
              {
                //  Need expiration date and replacement's name.
                if (thisPerson)
                {
                  if (Date.parse(proTemExpirationDate.value) > Date.parse('January 1, 2009'))
                  {
                    eventType = 'pro-tem';
                    confirmMsg += thisPerson.name + " is serving in place of "
                             currentSeatHolder.name + " until " + proTemExpirationDate.value + ".";
                  }
                  else throw new Error("The pro tem expiration date is not valid");
                }
                else throw new Error("No person " (personText.value !== "" ? 
                         "('"+personText.value+"') ":"") + "named to act as pro tem replacement.");
              }
              else if (proceduralRadioButton.checked)
              {
                proceduralComment.value = trim(proceduralComment.value);
                if (proceduralComment.value !== '')
                {
                  if (Date.parse(vacancyDate.value) > Date.parse('January 1, 2009'))
                  {
                    eventType = 'procedural';
                    confirmMsg += currentSeatHolder.name + " vacated seat " + seat_id + " on " + 
                                  vacancyDate.value + ' because "' + proceduralComment.value + '"';
                  }
                  else throw new Error("Vacancy date is not valid.");
                }
                else throw new Error("Please describe the procedural event.");
              }
              else throw new Error("Select one of the reasons.");

              //  Verify with the user, and do the deed.
              if (confirm(confirmMsg))
              {
                updateSeat();
                resetPersonForm();
              }
              else alert('No change made');
            }
            catch (e)
            {
              alert(e.message);
            }

            {
              Core.preventDefault(evt);
            }
          }

        //  suggestionChoiceListener()
        //  ---------------------------------------------------------------------------------------
        /*  Name chosen from the suggestion list using the mouse.
         */
          function suggestionChoiceListener(evt)
          {
            evt = evt ? evt : window.event;
            personText.value = allPersonsList[this.allPersonsIndex].name;
            resetPersonForm();
            allPersonsIndex = this.allPersonsIndex;
            personSubmitListener(evt);
          }

        //  displaySuggestionList()
        //  ---------------------------------------------------------------------------------------
        /*  Creates entire suggestion list based on what has been entered in the personText field.
         */
          function displaySuggestionList()
          {
            while (suggestionList.firstChild) suggestionList.removeChild(suggestionList.firstChild);
            suggestionListItems = [];
            allPersonsIndex     = -1; // Nobody from the database.
            suggestionListIndex = -1; // Nobody from suggestion list.
            var re = new RegExp(personText.value, 'i');
            for (var i = 0; i < allPersonsList.length; i++)
            {
              if (re.test(allPersonsList[i].name) && allPersonsList[i].is_faculty == is_faculty_seat)
              {
                var listItem = document.createElement('li');
                listItem.textContent = allPersonsList[i].name;
                if (allPersonsList[i].is_faculty) Core.addClass(listItem, 'faculty');
                listItem.allPersonsIndex = i;
                suggestionList.appendChild(listItem);
                Core.addEventListener(listItem, 'click', suggestionChoiceListener);
                suggestionListItems.push(listItem);
              }
            }
            suggestionList.style.visibility = (suggestionListItems.length > 0) ? 'visible' : 'hidden';
          }

        //  Keyboard event listeners
        //  =======================================================================================
        /*
         *  -moz and -webkit:
         *  Arrows, tab, letters, and esc are on keyup
         *  Enter is on keypress
         *
         *  -moz: arrows and tab happen on keypress also
         *
         *  Opera?
         *    Throws a 'SyntaxError' from the last line of json2.js.
         *    Unable to resolve: the json returned from manage_seats.php is valid.
         *
         *  IE?
         */

        //  keypressListener()
        //  ---------------------------------------------------------------------------------------
        /*  Keypress in the person input field: respond to up and down arrow keys for navigating the
         *  suggestion list. But only if the browser generates the events! If not, fall back to
         *  handling them using keyup events. (And autorepeat won't work.)
         */
          function keypressListener(evt)
          {
            evt = evt ? evt : window.event;
            if ((evt.keyCode !== 13) && (evt.keyCode !== 9) && (evt.keyCode !== 38) && (evt.keyCode !== 40)) return;

            if (evt.keyCode === 38) // up arrow
            {
              keypressArrows = true;
              if (suggestionListIndex > 0)
              {
                Core.removeClass(suggestionListItems[suggestionListIndex], 'current-choice');
                suggestionListIndex--;
                Core.addClass(suggestionListItems[suggestionListIndex], 'current-choice');
              }
              return;
            }
            if (evt.keyCode === 40) // dn arrow
            {
              keypressArrows = true;
              if (suggestionList.style.visibility === 'hidden') displaySuggestionList();
              if (suggestionListIndex < (suggestionListItems.length - 1))
              {
                if (suggestionListIndex > -1)
                {
                  Core.removeClass(suggestionListItems[suggestionListIndex], 'current-choice');
                }
                ++suggestionListIndex;
                Core.addClass(suggestionListItems[suggestionListIndex], 'current-choice');
              }
              return;
            }

            //    If there is a suggestion list item selected, use it as the person text value.
            //    Then use the person text value as the selected name.
            if ((suggestionListIndex > -1) && (suggestionListIndex < suggestionListItems.length))
            {
              personText.value = suggestionListItems[suggestionListIndex].firstChild.nodeValue;
              Core.preventDefault(evt);
            }
          }

        //  keyupListener()
        //  ---------------------------------------------------------------------------------------
        /*  Keyup in the person input field.
         */
          function keyupListener(evt)
          {
            evt = evt ? evt : window.event;
            // Ignore arrow keys if they generate keypress events
            if (keypressArrows && ((evt.keyCode === 38) || (evt.keyCode === 40))) return;
            //  Otherwise, check for and process arrow keys
            if (evt.keyCode === 38) // up arrow
            {
              if (suggestionListIndex > 0)
              {
                Core.removeClass(suggestionListItems[suggestionListIndex], 'current-choice');
                suggestionListIndex--;
                Core.addClass(suggestionListItems[suggestionListIndex], 'current-choice');
              }
              return;
            }
            if (evt.keyCode === 40) // dn arrow
            {
              if (suggestionList.style.visibility === 'hidden') displaySuggestionList();
              if (suggestionListIndex < (suggestionListItems.length - 1))
              {
                if (suggestionListIndex > -1)
                {
                  Core.removeClass(suggestionListItems[suggestionListIndex], 'current-choice');
                }
                ++suggestionListIndex;
                Core.addClass(suggestionListItems[suggestionListIndex], 'current-choice');
              }
              return;
            }
            //  For non-arrow keys, create prompt list based on what the user has entered so far.
            if (personText.value !== "")
            {
              displaySuggestionList();
            }
          }


        //  checkEscapeListener()
        //  ---------------------------------------------------------------------------------------
        /*  Reset dialog if user presses the Esc key: active all the time for any keyup event.
         */
          function checkEscapeListener(evt)
          {
            evt = evt ? evt : window.event;
            if (evt.keyCode === 27) resetPersonForm();
          }


        //  init_xmlhttpreq()
        //  ---------------------------------------------------------------------------------------
        /*  Creates a new XMLHttpRequest object.
         */
          function init_xmlhttpreq(target, handler)
          {
            xmlhttpreq = null;
            try
            {
              xmlhttpreq = new XMLHttpRequest();
            }
            catch (error)
            {
              try
              {
                xmlhttpreq = new ActiveXObject('Microsoft.XMLHTTP');
              }
              catch (error)
              {
                alert('Unable to connect to database');
                return;
              }
            }
            xmlhttpreq.onreadystatechange = handler;
            xmlhttpreq.open('GET', target, true);
            xmlhttpreq.send(null);
          }

        //  trim()
        //  ---------------------------------------------------------------------------------------
        /*    String trimmer.
         */
         function trim(str)
         {
           return /^\s*(.*)\s*$/.exec(str)[1];
         }

        //  Return Core.runnable object from encapsulating anonymous self-executing function.
        //  =======================================================================================
        return {

          //  init()
          //  -------------------------------------------------------------------------------------
          init: function()
          {

            //  Initialize the application
            //  -----------------------------------------------------------------------------------
            personForm                    = document.getElementById('person-form');
            personTextLabel               = document.getElementById('person-prompt-label');
            personSelectFieldset          = document.getElementById('person-select-fieldset');

            eventTypeFieldset             = document.getElementById('event-type-fieldset');
            renewalRadioButton            = document.getElementById('renewal-radio');
            proTemRadioButton             = document.getElementById('pro-tem-radio');
            proceduralRadioButton         = document.getElementById('procedural-radio');
            graduationRadioButton         = document.getElementById('graduation-radio');
            resignationRadioButton        = document.getElementById('resignation-radio');
            newChairRadioButton           = document.getElementById('chair-change-radio');
            departureRadioButton          = document.getElementById('departure-radio');

            proTemOrSeatHolderFieldset    = document.getElementById('pro-tem-or-seat-holder-fieldset');
            proTemPersonRadioButton       = document.getElementById('pro-tem-person-radio');
            seatHolderPersonRadioButton   = document.getElementById('seat-holder-person-radio');
            proTemOrSeatHolderEventType   = document.getElementById('which-person-event-type');
            proTemPersonName              = document.getElementById('pro-tem-person-name');
            seatHolderPersonName          = document.getElementById('seat-holder-person-name');

            electionDateFieldset          = document.getElementById('election-date-fieldset');
            electionDate                  = document.getElementById('election-date');
            vacancyDateFieldset           = document.getElementById('vacancy-date-fieldset');
            vacancyDatePromptLabel        = document.getElementById('vacancy-date-prompt-label');
            vacancyDate                   = document.getElementById('vacancy-date');
            proTemElectionDateFieldset    = document.getElementById('pro-tem-election-date-fieldset');
            proTemElectionDate            = document.getElementById('pro-tem-election-date');
            proTemExpirationDateFieldset  = document.getElementById('pro-tem-expiration-date-fieldset');
            proTemExpirationDate          = document.getElementById('pro-tem-expiration-date');
            proceduralCommentFieldset     = document.getElementById('procedural-comment-fieldset');
            proceduralComment             = document.getElementById('procedural-comment-text');

            suggestionList                  = document.createElement('ul');
            personSelectFieldset.appendChild(suggestionList);
            personText                      = document.getElementById('person-text');
            personText.value                = '';
            personText.setAttribute('autocomplete', 'off');
            suggestionList.style.visibility = 'hidden';
            personForm.style.visibility     = 'hidden';

            //  Initialize the choice list from get_all_names.
            //  -----------------------------------------------------------------------------------
            init_xmlhttpreq('scripts/get_all_names.php', initializeAllPersonsList, null);

            var cancelButton                = document.getElementById('cancel-button');
            Core.addEventListener(cancelButton,                 'click',    resetPersonForm);
            Core.addEventListener(document,                     'keyup',    checkEscapeListener);

            Core.addEventListener(renewalRadioButton,           'click',    formatEventDialog);
            Core.addEventListener(graduationRadioButton,        'click',    formatEventDialog);
            Core.addEventListener(departureRadioButton,         'click',    formatEventDialog);
            Core.addEventListener(proTemRadioButton,            'click',    formatEventDialog);
            Core.addEventListener(proceduralRadioButton,        'click',    formatEventDialog);
            Core.addEventListener(resignationRadioButton,       'click',    formatEventDialog);
            Core.addEventListener(newChairRadioButton,          'click',    formatEventDialog);
            Core.addEventListener(proTemPersonRadioButton,      'click',    formatEventDialog);
            Core.addEventListener(seatHolderPersonRadioButton,  'click',    formatEventDialog);
            Core.addEventListener(personText,                   'keyup',    keyupListener);
            Core.addEventListener(personText,                   'keypress', keypressListener);
            Core.addEventListener(personForm,                   'submit',   personSubmitListener);
          }
        };
      }
    )()
  );
}
