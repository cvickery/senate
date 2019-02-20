/// $Id: manage_people.js,v 1.1 2009/11/01 04:52:34 vickery Exp vickery $

/*  This code manages the user interface for the manage_people application. The user can search for people, and by
 *  clicking on a row in the resulting table, can bring up an editing panel where s/he can add/change/delete values.
 *
 *  TODO  Implement ^Z listener for the edit panel. The undo list is built, but need to pop values off it into the
 *  currently being displayed panel.
 *
 *  You are working on these: be sure you got all the elements from the doc (student-specific info fieldset and the two
 *  text inputs for id and verified. Populate the is instructional checkbox from the db object. turn off the
 *  student-only fieldset when it's a faculty. I think they should be able to check instructional faculty or
 *  non-instructional faculty (radio behavior.)
 *
 *  TODO  Need a search button on the search form; onblur causes reposts. (on blur checks if anything has changed
 *  instead?
 *
 *  C. Vickery
 *  December, 2008
 *
 *  $Log: manage_people.js,v $
 *  Revision 1.1  2009/11/01 04:52:34  vickery
 *  Initial revision
 *
 *
 */
Core.start(
  ( function()
    {
      var databaseUnreachableText = document.createTextNode("Database Unreachable!");
      var bodyElement = null;
      var resultsTable = null;
      var rowBeingEdited = null;
      var resultsTableBody = null;
      var resultsCols = null;
      var colBeingResized = null;

      var undoList = [];
      var editingObject = null;

      //  Search form elements
      var searchForm = null;
      var searchText = null;
      var searchFacultyBox = null;
      var searchNoninstructionalFacultyBox = null;
      var searchUndergraduateBox = null;
      var searchGraduateBox = null;
      var searchEveningBox = null;
      var searchForeignBox = null;

      var resultArray = null;
      var messageDiv = null;

      //  Edit form elements
      var editForm = null;
      var editFormStartX = null;
      var editFormStartY = null;
      var lastMouseX = null;
      var lastMouseY = null;
      var personIdMsg = null;
      var numEditsMsg = null;
      var editFacultyBox = null;
      var editInstructionalBox = null;
      var editUndergraduateBox = null;
      var editGraduateBox = null;
      var editEveningBox = null;
      var editForeignBox = null;
      var editStudentIdBox = null;
      var editFirstNameText = null;
      var editLastNameText = null;
      var editQCEmailText = null;
      var editAlternateEmailText = null;
      var editCellPhoneText = null;
      var editWorkPhoneText = null;
      var editHomePhoneText = null;
      var editWorkAddressText = null;
      var editHomeAddressText = null;

      var editStudentSpecificFieldset = null;
      var editStudentIdText = null;
      var editStudentVerifiedText = null;
      var editFacultyDepartmentSelect = null;
      var editFirstUndergraduateMajorSelect = null;
      var editSecondUndergraduateMajorSelect = null;
      var editGraduateMajorSelect = null;

      var editCommitButton = null;
      var editCancelButton = null;

      //  When inserting a new person rather than editing an existing one
      var addingPerson = false;

      //  AJAX
      var requestObject = null;

      //  Name strings extracted to use in people search
      var last_name = '';
      var first_name = '';

      var prefixRegex = /^\s*(Dr\.?|Prof\.?|Mr\.?|Ms\.?|Mrs\.)?\s*([a-z\u00c0-\u017f�\(\)\.\-\?\+\*, ]+)$/i;

      /*  Chicago recommends omitting periods from prefixes and suffixes. We accept them most anywhere if present,
       *  and then get rid of them later.
       *
       *  Degree suffixes are not part of the name, but Sr/Jr/I, II, etc are.
       *  Sr, Jr, and degree suffixes may optionally be preceded by a comma, which is discarded.
       *
       *  The recognized degree suffixes are: PhD, MD, and EdD.
       */
      var degreeSuffixList = "Ph\\.?D\\.?|MD|Ed\\.?D";
      var degreeSuffixRegex = new RegExp("\\s*([a-z\u00c0-\u017f\\'\\.\\-\\?\\+\\*, ]*),?\\s*(" + degreeSuffixList + ")\\s*$", "i");
      var commaSuffixRegex = new RegExp("^\\s*(Sr\\.?|Jr\\.?|" + degreeSuffixList + ")", "i");
      var nameSuffixList = ['JR','SR','I','II','III','IV','V','VI','VII','VIII','IX','X'];

      //  CloneObject()
      //  -------------------------------------------------------------------------------------------
      /*  Does what the name says and includes recursive copying of nested objects.
       *  Taken from http://www.irt.org/script/879.htm
       *  Fixed bug due to typeof null => 'object'.
       */
      var CloneObject = function(what)
      {
        for (var i in what)
        {
          if (what[i] && typeof what[i] == 'object')
          {
            this[i] = new CloneObject(what[i]);
          }
          else
          {
            this[i] = what[i];
          }
        }
      };

      //  dontSubmit()
      //  ----------------------------------------------------------------------
      /*  Prevent bogus form submission
       */
      var dontSubmit = function(evt)
      {
        evt = evt || window.event;
        Core.preventDefault(evt);
      };

      //  clearError()
      //  -----------------------------------------------------------------------
      /*  Remove error indication from search field when user types anything into
       *  it.
       */
       var clearError = function()
       {
         Core.removeClass(searchText, "error-input");
         Core.removeEventListener(searchText, 'keydown', clearError);
       };

      //  generateStatusString()
      //  ------------------------------------------------------------------------------------------
      /*  Generates a string to show what kind of person an object represents.
       */
      var generateStatusString = function(obj)
      {
        var status = '';
        if ( obj.is_faculty)                { status = 'Faculty'; }
        if ( obj.is_undergraduate_student)  { status = 'Undergrad'; }
        if ( obj.is_graduate_student)       { status = 'Grad'; }
        if ( obj.is_evening_student)        { status = status + ' (eve)'; }
        if ( obj.is_foreign_student)        { status = status + ' (foreign)'; }
        return status;
      };

      //  generatePhoneString()
      //  -------------------------------------------------------------------------------------------
      /*  Generate a formatted string showing values of whatever phone numbers are available.
       */
      var generatePhoneString = function(obj)
      {
        var phone = '';
        if (obj.work_phone !== '')    { phone = phone + obj.work_phone + ' (work)'; }
        if (obj.home_phone !== '')    { phone = ((phone === '') ? '' : phone + '; ' ) + obj.home_phone + ' (home)'; }
        if (obj.cell_phone !== '')    { phone = ((phone === '') ? '' : phone + '; ' ) + obj.cell_phone + ' (cell) '; }
        return phone;
      };

      //  generateAddressString()
      //  -------------------------------------------------------------------------------------------
      /*  Generate a formatted string showing values of whatever addresses are available.
       */
      var generateAddressString = function(obj)
      {
        var address = '';
        if (obj.work_address) { address = address + obj.work_address + ' (work)'; }
        if (obj.home_address) { address = ((address === '') ? '' : address + '; ') + obj.home_address + ' (home) '; }
        return address;
      };

      //  addPersonHandler()
      //  ------------------------------------------------------------------------------------------------------
      /*  When an addPerson button is clicked, fill in the editing panel and display it.
       */
      var addPersonHandler = function(evt)
      {
        addingPerson = true;
        editCommitButton
        editForm.style.display = 'block';
      };

      //  editHandler()
      //  ------------------------------------------------------------------------------------------------------
      /*  Processes clicks in a row of a search results table and displays an editing form.
       *  Fill in the edit form fields with data from the selected row, saving the values in case the user needs
       *  to undo. When the user clicks the commit button, send the info object to the updater.
       *
       *  TODO  Need to put in a ^Z handler.
       */
      var editHandler = function(evt)
      {
        //  Ignore row clicks while editing a row
        if (rowBeingEdited) { return; }

        //  Process the row click ...
        evt = evt || window.event;

        //  Create an editing object from the db info; initialize or update undoList.
        var numEdits = 0, copula = 'are', suffix = 's';
        var which_id = resultArray[this.whichRow].id;
        if (undoList[which_id] !== undefined && undoList[which_id].length > 0)
        {
          editingObject = undoList[which_id].pop();
        }
        else
        {
          editingObject = new CloneObject(resultArray[this.whichRow]);
          undoList[which_id] = [];
        }
        numEdits = undoList[which_id].length;
        if (numEdits === 1) { copula = 'is'; suffix = '';}

        rowBeingEdited = this;
        Core.addClass(rowBeingEdited, 'beingEdited');
        personIdMsg.firstChild.nodeValue = 'You are editing id #' + editingObject.id + '.';
        numEditsMsg.firstChild.nodeValue = 'There ' + copula + ' ' + numEdits + ' edit' + suffix + ' that you can undo.';
        editFacultyDepartmentSelect.parentNode.style.display = 'none';
        editFirstUndergraduateMajorSelect.parentNode.style.display = 'none';
        editSecondUndergraduateMajorSelect.parentNode.style.display = 'none';
        editGraduateMajorSelect.parentNode.style.display = 'none';

        //  Populate the form using the corresponding resultArray object info.
        editFacultyBox.checked = editingObject.is_faculty;
        editInstructionalBox.checked = editingObject.is_instructional_faculty;
        editUndergraduateBox.checked = editingObject.is_undergraduate_student;
        editGraduateBox.checked = editingObject.is_graduate_student;
        editEveningBox.checked = editingObject.is_evening_student;
        editForeignBox.checked = editingObject.is_foreign_student;

        /*  Major/Department Selection Mechanism Explained
         *    When get_division_info.php was included from manage_people.xhtml, it built
         *    arrays of information about departments, undergraduate, and graduate majors
         *    from the database. Then when manage_people.xhtml generated the select boxes
         *    for departments and majors it used the id of the corresponding department
         *    or major from its respective table as the value of the option. So here, we
         *    compare the department or major id for the person with the values of the
         *    options, and viola! we get to select the right one. It's obvious, but I
         *    thought it would be nice to document it somewhere anyway. And buried in the
         *    middle of this code seemed appealing at the time.
         */
        if (editFacultyBox.checked)
        {
          var i;
          var options = editFacultyDepartmentSelect.getElementsByTagName('option');
          for (i = 0; i < options.length; i++)
          {
            if ( options[i].getAttribute('value') ===  editingObject.department_id )
            {
              options[i].selected = 'selected';
              break;
            }
          }
          editFacultyDepartmentSelect.parentNode.style.display = 'table-row';
        }
        if (editUndergraduateBox.checked)
        {
          options = editFirstUndergraduateMajorSelect.getElementsByTagName('option');
          for (i = 0; i < options.length; i++)
          {
            if (options[i].getAttribute('value') === editingObject.first_major_id)
            {
              options[i].selected = 'selected';
              break;
            }
          }
          editFirstUndergraduateMajorSelect.parentNode.style.display = 'table-row';
          options = editSecondUndergraduateMajorSelect.getElementsByTagName('option');
          for (i = 0; i < options.length; i++)
          {
            if (options[i].getAttribute('value') === editingObject.second_major_id)
            {
              options[i].selected = 'selected';
              break;
            }
          }
          editSecondUndergraduateMajorSelect.parentNode.style.display = 'table-row';
        }
        if (editGraduateBox.checked)
        {
          options = editGraduateMajorSelect.getElementsByTagName('option');
          for (i = 0; i < options.length; i++)
          {
            if (options[i].getAttribute('value') === editingObject.graduate_major_id)
            {
              options[i].selected = 'selected';
              break;
            }
          }
          editGraduateMajorSelect.parentNode.style.display = 'table-row';
        }
        //  Populate the text input fields with current values
        editFirstNameText.value = editingObject.first_name;
        editLastNameText.value = editingObject.last_name;
        editQCEmailText.value = editingObject.qc_email;
        editAlternateEmailText.value = editingObject.alternate_email;
        editCellPhoneText.value = editingObject.cell_phone;
        editWorkPhoneText.value = editingObject.work_phone;
        editHomePhoneText.value = editingObject.home_phone;
        editWorkAddressText.value = editingObject.work_address;
        editHomeAddressText.value = editingObject.home_address;
        editStudentIdText.value = editingObject.student_id;

        //  Save current state for possible undo
        undoList[editingObject.id].push(editingObject);
        addingPerson = false;
        editForm.style.display = 'block';
      };

       //  searchStateChangeHandler()
      //  -----------------------------------------------------------------------------------
      /*  Display the results of a search query, if any.
       *
       */
      var searchStateChangeHandler = function()
      {
        if (requestObject.readyState != 4) { return; }
        var child = null;
        while ( (child = resultsTableBody.firstChild) ) { resultsTableBody.removeChild(child); }
        while ( (child = messageDiv.firstChild) ) { messageDiv.removeChild(child); }
        Core.removeClass(messageDiv, 'normal-message');
        Core.removeClass(messageDiv, 'error-message');
        messageDiv.style.display = 'none';

        if (requestObject.status == 200 || requestObject.status == 304)
        {
          //  Get the json-encoded array of results
          resultArray = JSON.parse(requestObject.responseText);
          //  If the array is not empty, add a row to the table
          //  for each one and display the table.
          //  Each row has the following fields:
          //    id; Name; Status; QC Email; Alt Email; Phone; Address;

          last_name = last_name.replace(/''/g, "'");
          if (resultArray.length === 0)
          {
            //  default people type if none or multiple types checked
            var peopleType = 'people';
            var typeCode = 0;
            if ( searchFacultyBox.checked )                 { typeCode |= 1; }
            if ( searchUndergraduateBox.checked )           { typeCode |= 2; }
            if ( searchGraduateBox.checked )                { typeCode |= 4; }
            if ( searchNoninstructionalFacultyBox.checked)  { typeCode |= 8 ;}
            switch (typeCode)
            {
              case 1: peopleType = 'faculty'; break;
              case 2: peopleType = 'undergraduate students'; break;
              case 4: peopleType = 'graduate students'; break;
              case 6: peopleType = 'students'; break;
              case 8: peopleType = 'instructional faculty'; break;
              case 9: peopleType = 'faculty';
            }

            var msg = 'No ' + peopleType + ' found with a last name like "' + last_name + '"';
            if (first_name !== '') { msg += ' and first name like "' + first_name + '"'; }
            msg += '.';
            messageDiv.appendChild(document.createTextNode(msg));

            if ( ! /[\*\?]/.test(first_name+last_name) )
            {
              var addPersonButton = document.createElement('button');
              addPersonButton.appendChild(document.createTextNode('Add ' + first_name + " " + last_name));
              messageDiv.appendChild( addPersonButton );
              addPersonButton.onclick = addPersonHandler;
            }
            Core.removeClass(messageDiv, 'error-message');
            Core.addClass(messageDiv, 'normal-message');
            messageDiv.style.display = 'block';

            editFirstNameText.value = first_name;
            editLastNameText.value = last_name;
            editQCEmailText.value = '';
            editAlternateEmailText.value = '';
            editCellPhoneText.value = '';
            editWorkPhoneText.value = '';
            editHomePhoneText.value = '';
            editWorkAddressText.value = '';
            editHomeAddressText.value = '';
            editStudentIdText.value = '';
            editFacultyBox.checked = false;
            editInstructionalBox.checked = false;
            editUndergraduateBox.checked = false;
            editGraduateBox.checked = false;
            editEveningBox.checked = false;
            editForeignBox.checked = false;
            editFacultyDepartmentSelect.parentNode.style.display = 'none';
            editFirstUndergraduateMajorSelect.parentNode.style.display = 'none';
            editSecondUndergraduateMajorSelect.parentNode.style.display = 'none';
            editGraduateMajorSelect.parentNode.style.display = 'none';
            return;
          }

          //  Compound values derived from multiple columns.
          var phone = '', address = '';

          //  Loop through all the rows returned from the db
          for (var i = 0; i < resultArray.length; i++)
          {
            if (resultArray[i].id === 1) { continue; } // ignore user 'OPEN'
            //  Normalize db representation of booleans ('t' and 'f') into JS booleans
            resultArray[i].is_faculty               = resultArray[i].is_faculty == 't';
            resultArray[i].is_instructional_faculty = resultArray[i].is_instructional_faculty == 't';
            resultArray[i].is_undergraduate_student = resultArray[i].is_undergraduate_student == 't';
            resultArray[i].is_graduate_student      = resultArray[i].is_graduate_student == 't';
            resultArray[i].is_evening_student       = resultArray[i].is_evening_student == 't';
            resultArray[i].is_foreign_student       = resultArray[i].is_foreign_student == 't';
            //  Treat null QC email as 'missing'
            if (resultArray[i].qc_email === null) { resultArray[i].qc_email = 'missing'; }

            //  Build a table row for the db row.
            var thisRow = document.createElement('tr');
            var thisCell = document.createElement('td');
            //  id
            thisCell.appendChild(document.createTextNode(resultArray[i].id));
            thisRow.appendChild(thisCell);
            //  Name
            thisCell = document.createElement('td');
            thisCell.appendChild(document.createTextNode(resultArray[i].last_name +
                  ((resultArray[i].first_name === '') ? '' : ', ') + resultArray[i].first_name));
            thisRow.appendChild(thisCell);
            //  Status
            thisCell = document.createElement('td');

            thisCell.appendChild(document.createTextNode(generateStatusString(resultArray[i])));
            thisRow.appendChild(thisCell);
            //  QC Email
            thisCell = document.createElement('td');
            thisCell.appendChild(document.createTextNode(resultArray[i].qc_email));
            thisRow.appendChild(thisCell);
            //  Alt Email
            thisCell = document.createElement('td');
            thisCell.appendChild(document.createTextNode(resultArray[i].alternate_email));
            thisRow.appendChild(thisCell);
            //  Phone
            thisCell = document.createElement('td');
            thisCell.appendChild(document.createTextNode(generatePhoneString(resultArray[i])));
            thisRow.appendChild(thisCell);
            //  Address
            thisCell = document.createElement('td');
            thisCell.appendChild(document.createTextNode(generateAddressString(resultArray[i])));
            thisRow.appendChild(thisCell);

            resultsTableBody.appendChild(thisRow);
            thisRow.whichRow = i;
            thisRow.onclick = editHandler;
          }
          resultsTable.style.display = 'table';
        }
        else
        {
          messageDiv.appendChild( databaseUnreachableText) ;
          Core.addClass(messageDiv, 'error-message');
        }
      };

      //  doSearch()
      //  -----------------------------------------------------------------------
      /*  Parse search string into name parts, and do an appropriate search.
       *
       *  I pefer to think of this code as 'developed incrementally' rather than
       *  'debugged into existence.'
       *
       *  User may embed ? + and * chars for simple regex searches; a period
       *  will be inserted before each.
       */
      var doSearch = function(evt)
      {
        evt = evt || window.event;
        Core.preventDefault(evt);
        var full_name = searchText.value;

        //  Swap the name around if it appears to be in the last, first form.
        /*  Look for a comma that is not followed by Jr, Sr., or Ph.D
         */
        var commaIndex = full_name.indexOf(',');
        var nextCommaIndex = 0;
        var partToCheck = null;
        while (commaIndex > 0 && commaIndex < full_name.length -1)
        {
          if (commaIndex < full_name.length -1)
          {
            partToCheck = full_name.substring(commaIndex + 1);
            if ( partToCheck.match(commaSuffixRegex) )
            {
              nextCommaIndex = partToCheck.indexOf(',');
              if ( nextCommaIndex > 0)
              {
                commaIndex += nextCommaIndex + 1;
                continue;
              }
              else
              {
                break;
              }
            }
            else
            {
              full_name = full_name.substring(commaIndex+1) + " " + full_name.substring(0, commaIndex);
              break;
            }
          }
        }
        var prefix = prefixRegex.exec(full_name);

        if (prefix)
        {
          full_name = prefix[2];
          prefix = prefix[1] ? prefix[1] : '';
        }
        else
        {
          Core.addClass(searchText, "error-input");
          Core.addEventListener(searchText, 'keydown', clearError);
          searchText.focus();
          return;
        }
        var suffix = degreeSuffixRegex.exec(full_name);
        if (suffix)
        {
          full_name = suffix[1];
          suffix = suffix[2] ? suffix[2] : '';
          //  Strip all dots.
          var dotIndex = suffix.indexOf('.');
          while ( dotIndex > 0 )
          {
            suffix = suffix.substring(0,dotIndex) + suffix.substring(++dotIndex);
            if (dotIndex > suffix.length -1) { break; }
          }
          switch (suffix.toLowerCase())
          {
            case 'phd': suffix = 'PhD'; break;
            case 'edd': suffix = 'EdD'; break;
            case 'littd': suffix = 'LittD'; break;
            default: suffix = suffix.toUpperCase();
          }
        }
        else
        {
          suffix = '';
        }

        //  Parse the full name:
        /*
         *    Get rid of trailing whitespace and punctuation
         *    Split on whitespace
         *    Reverse first and last names if there is a comma.
         *    Special case last names that start with 'de ', 'van ', (others?)
         *    Special case last names that end with Sr, Jr, I..V, (others?)
         *    Supply "any character" periods before regex chars (?, +, *)
         */
        first_name = '';
        last_name = '';
        var workingName = full_name.split(' ');

        last_name = workingName.pop();
        //  Drop whitespace element at end, if present
        if ( last_name === '')
        {
          last_name = workingName.pop();
        }
        //  Get rid of trailing comma in last token, if present
        if (last_name.charAt(last_name.length - 1) === ',')
        {
          last_name = last_name.substring(0, last_name.length - 1);
        }

        //  Get rid of trailing period, if present (will add it back in for Sr./Jr.)
        if (last_name.charAt(last_name.length - 1) === '.')
        {
          last_name = last_name.substring(0, last_name.length - 1);
        }

        //  Handle name suffixes
        var saved_last_name = last_name; // In case of pseudo-suffix
        var i;
        for (i = 0; i < nameSuffixList.length; i++)
        {
          var nameSuffix = nameSuffixList[i];
          if ( last_name.toUpperCase() == nameSuffix )
          {
            if ( nameSuffix == 'SR' )
            {
              last_name = 'Sr.';
            }
            else if ( nameSuffix == 'JR' )
            {
              last_name = 'Jr.';
            }
            else
            {
              last_name = nameSuffix;
            }
            if (workingName.length > 0)
            {
              last_name = workingName.pop() + ' ' + last_name;
            }
            else
            {
              //  The last_name was the only thing entered; it wasn't actually a suffix
              last_name = saved_last_name;
            }
            break;
          }
        }
        //  Special case last name prefixes
        var lastNamePrefixes = ['van', 'de'];
        var temp = workingName.pop();
        if (temp)
        {
          var found = false;
          for (i = 0; i < lastNamePrefixes.length; i++)
          {
            if (temp.toLowerCase() === lastNamePrefixes[i])
            {
              last_name = temp + ' ' + last_name;
              found = true;
            }
          }
          if (!found) { workingName.push(temp); }
        }
        for (i = 0; i < workingName.length; i++)
        {
          //  Put a space between names after first one
          first_name = first_name + ((first_name === '') ? '' : ' ') + workingName[i];
        }
        //  Pre-dotificate regex chars in first and last names
        last_name = last_name.replace(/(\*|\+|\?)/g,".$1");
        first_name = first_name.replace(/(\*|\+|\?)/g,".$1");
        //  Change ' to �
        last_name = last_name.replace(/(\')/g,'�');

        var whereClause = "last_name ~* '" + last_name + "'";
        if (first_name !== '')  { whereClause += " AND first_name ~* '" + first_name + "'"; }

        //  Count checked search checkboxes
        var checkBoxes = Core.getElementsByClass('search-checkbox');
        var numChecked = 0;
        var whichOne = 0;

        //  Generate SQL for checkbox options
        for ( i = 0; i < checkBoxes.length; i++)
        {
          if (checkBoxes[i].checked) { numChecked++; }
        }
        if (numChecked > 0 )
        {
          whereClause += ' AND ';
          if (numChecked > 1) { (whereClause += '('); }

          var studentFacultyCopula = ' OR ';
          /*  Faculty options
           *  Case searchFaculty searchNonInstructionalFaculty
           *    0   not checked                 not checked                 NOT is_faculty
           *    1   not checked                     checked                 is_faculty AND NOT is_instructional_faculty
           *    2       checked                 not checked                 is_faculty AND is_instructional_faculty
           *    3       checked                     checked                 is_faculty
           */
          var caseValue = searchFacultyBox.checked ? 2 : 0;
          caseValue += searchNoninstructionalFacultyBox.checked ? 1 : 0;
          switch (caseValue)
          {
            case 0: whereClause += "(NOT is_faculty)";
                    studentFacultyCopula = ' AND ';
                    break;
            case 1: whereClause += "(is_faculty AND NOT is_instructional_faculty)";
                    break;
            case 2: whereClause += '(is_faculty AND is_instructional_faculty)';
                    break;
            case 3: whereClause += 'is_faculty';
                    break;
            default:  alert('bad switch error: faculty type');
          }
          whichOne += ((caseValue & 2) ? 1 : 0) + ((caseValue & 1) ? 1 : 0);
          if (whichOne < numChecked) { whereClause += studentFacultyCopula; }

          /* Graduate/Undergraduate options
           * Case undergraduate graduate  eve   foreign
           *    0           not     not   not   not     error
           *    1           not     not   not   is      is_for
           *    2           not     not    is   not     is_eve
           *    3           not     not    is   is      is_eve OR is_for
           *    4           not     is    not   not     is_grad
           *    5           not     is    not   is      is_grad OR is_for
           *    6           not     is     is   not     is_grad OR is_eve
           *    7           not     is     is   is      is_grad OR is_for OR is_eve
           *    8           is      not   not   not     is_under
           *    9           is      not   not   is      is_under AND is_for
           *    A           is      not    is   not     is_under AND is_eve
           *    B           is      not    is   is      is_under AND (is_eve OR is_for)
           *    C           is      is    not   not     is_under OR is_grad
           *    D           is      is    not   is      (is_under AND is_for) OR is_grad
           *    E           is      is    is    not     (is_under AND is_eve) OR is_grad
           *    F           is      is    is    is      (is_under AND (is_eve OR is_for)) OR is_grad
           */

          caseValue = searchUndergraduateBox.checked ? 8 : 0;
          caseValue += searchGraduateBox.checked ? 4 : 0;
          caseValue += searchEveningBox.checked ? 2 : 0;
          caseValue += searchForeignBox.checked ? 1 : 0;
          switch (caseValue)
          {
            case 0: //  Ignore: must be searching only for faculty
                    break;
            case 1: whereClause += 'is_foreign_student)';
                    break;
            case 2: whereClause += 'is_evening_student';
                    break;
            case 3: whereClause += '(is_evening_student OR is_foreign_student)';
                    break;
            case 4: whereClause += 'is_graduate_student';
                    break;
            case 5: whereClause += 'is_graduate_student OR is_foreign_student';
                    break;
            case 6: whereClause += 'is_graduate_student OR is_evening_student';
                    break;
            case 7: whereClause += 'is_graduate_student OR is_foreign_student OR is_evening_student';
                    break;
            case 8: whereClause+= 'is_undergraduate_student';
                    break;
            case 9: whereClause += '(is_undergraduate_student AND is_foreign_student)';
                    break;
            case 10: whereClause += '(is_undergraduate_student AND is_evening_student)';
                    break;
            case 11: whereClause += '(is_undergraduate_student AND (is_evening_student OR is_foreign_student))';
                    break;
            case 12: whereClause+= 'is_undergraduate_student OR is_graduate_student';
                    break;
            case 13: whereClause += '(is_undergraduate_student AND is_foreign_student) OR is_graduate_student';
                    break;
            case 14: whereClause += '(is_undergraduate_student AND is_evening_student) OR is_graduate_student';
                    break;
            case 15: whereClause += '(is_undergraduate_student AND (is_evening_student OR is_foreign_student)) OR is_graduate_student';
                    break;
          }
          if (numChecked > 1) { whereClause += ')'; }
        }
        whereClause += ' ORDER BY is_faculty DESC, upper(last_name)';
        if (searchText.value !== "")
        {
          requestObject = new XMLHttpRequest();
          requestObject.open('POST', './scripts/manage_people.php', true);
          requestObject.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
          requestObject.send("whereClause="+whereClause);
          requestObject.onreadystatechange = searchStateChangeHandler;
          resultsTable.style.display = 'none';
        }
      };

      //  searchKeyupListener()
      //  -----------------------------------------------------------------------
      /*  Trigger search if user types Enter key in the search box.
       */
       var searchKeyupListener = function(evt)
       {
         evt = evt || window.event;
         if (evt.keyCode == 13)
         {
           doSearch(evt);
         }
       };

      //  Cancel/Commit edits
      //  ========================================================================================================

      //  cancelButtonListener()
      //  --------------------------------------------------------------------------------------------------------
      /*  Kills the editing panel without updating the database or results table.
       */
      var  cancelButtonListener = function(evt)
      {
        evt = evt || window.event;

        //  Do not submit the form. (Any button inside a form seems to submit it by default.)
        Core.preventDefault(evt);

        if (! addingPerson)
        {
          //  Clean up the table and kill the panel
          Core.removeClass(rowBeingEdited, 'beingEdited');
          rowBeingEdited = null;
        }
        editForm.style.display = 'none';
      };

      //  updateStateChangeHandler();
      //  ---------------------------------------------------------------------------------------
      /*  Process reply from an update request.
       */
      var updateStateChangeHandler = function()
      {
        if (requestObject.readyState !== 4) { return; }

        if (requestObject.status === 200 || requestObject.status === 304)
        {
          //  Provide feedback on database update
          if (! addingPerson)
          {
            Core.removeClass(rowBeingEdited, 'beingEdited');
            if (requestObject.responseText !== '1')
            {
              alert('Update Failed: ' + requestObject.responseText);
            }
            else
            {
              Core.addClass(rowBeingEdited, 'hasChanged');
            }
          }
          else
          {
            if (requestObject.responseText !== '1')
            {
              alert( 'Insert Failed: ' + requestObject.responseText);
            }
            else
            {
              while ( (child = messageDiv.firstChild) ) { messageDiv.removeChild(child); }
              messageDiv.appendChild(document.createTextNode('Inserted ' + first_name + " " + last_name  + '.'));
              Core.removeClass(messageDiv, 'error-message');
              Core.addClass(messageDiv, 'normal-message');
              messageDiv.style.display = 'block';
            }
          }
          rowBeingEdited = null;
          editForm.style.display = 'none';
        }
      };

      //  commitButtonHandler()
      //  --------------------------------------------------------------------------------------------------------
      /*  Gets the information from the editing form. If it is different from the original data, create an
       *  undo record and update the database.
       *  TODO Test if this an edit (update) or add (insert) operation.
       */
      var  commitButtonHandler = function(evt)
      {
        evt = evt || window.event;

        //  Do not submit the form
        Core.preventDefault(evt);

        //  Capture the form data in an updateObject.
        var updateObject = {};
        updateObject.id = (! addingPerson) ? editingObject.id : 0;
        updateObject.first_name = editFirstNameText.value;
        updateObject.last_name = editLastNameText.value;
        updateObject.qc_email = editQCEmailText.value === '' ? 'missing' : editQCEmailText.value;
        updateObject.alternate_email = editAlternateEmailText.value;
        updateObject.cell_phone = editCellPhoneText.value;
        updateObject.work_phone = editWorkPhoneText.value;
        updateObject.home_phone = editHomePhoneText.value;
        updateObject.work_address = editWorkAddressText.value;
        updateObject.home_address = editHomeAddressText.value;
        updateObject.is_faculty = editFacultyBox.checked;
        updateObject.is_instructional_faculty = editInstructionalBox.checked;
        updateObject.is_undergraduate_student = editUndergraduateBox.checked;
        updateObject.is_graduate_student = editGraduateBox.checked;
        updateObject.is_evening_student = editEveningBox.checked;
        updateObject.is_foreign_student = editForeignBox.checked;
        updateObject.student_id = editStudentIdText.value;

        //  Departent or major.
        /*  FYI: If a person was a student and becomes a graduate student, their undergraduate_major_id will not be
         *  erased. But it shouldn't matter because the booleans will tell whether the person is currently an
         *  undergraduate or graduate. Likewise for changes to faculty status (or fixing a person's status that somehow
         *  got entered wrong.)
         */
        updateObject.department_id      = '';
        updateObject.first_major_id     = '';
        updateObject.second_major_id    = '';
        updateObject.graduate_major_id  = '';

        var options, i;
        if (editFacultyBox.checked)
        {
          options = editFacultyDepartmentSelect.getElementsByTagName('option');
          for (i = 0; i < options.length; i++)
          {
            if (options[i].selected)
            {
              updateObject.department_id = options[i].getAttribute('value');
              break;
            }
          }
        }
        if (editUndergraduateBox.checked)
        {
          options = editFirstUndergraduateMajorSelect.getElementsByTagName('option');
          for (i = 0; i < options.length; i++)
          {
            if (options[i].selected)
            {
              updateObject.first_major_id = options[i].getAttribute('value');
              break;
            }
          }
          options = editSecondUndergraduateMajorSelect.getElementsByTagName('option');
          for (i = 0; i < options.length; i++)
          {
            if (options[i])
            {
              updateObject.second_major_id = options[i].getAttribute('value');
              break;
            }
          }
        }
        if (editGraduateBox.checked)
        {
          options = editGraduateMajorSelect.getElementsByTagName('option');
          for (i = 0; i < options.length; i++)
          {
            if ( options[i].selected)
            {
              updateObject.graduate_major_id = options[i].getAttribute('value');
              break;
            }
          }
        }

        //  ... and see if anything has changed.
        var hasChanged = false;
        for (var p in updateObject)
        {
          if ( !editingObject || (updateObject[p] != editingObject[p]) )
          {
            hasChanged = true;
            break;
          }
        }
        if (! hasChanged)
        {
          cancelButtonListener(evt);
          return;
        }

        //  Update the table cells for the row being edited.
        if (! addingPerson)
        {
          var cells = rowBeingEdited.getElementsByTagName('td');
          cells[1].firstChild.nodeValue = updateObject.last_name + ", " + updateObject.first_name;
          cells[2].firstChild.nodeValue = generateStatusString(updateObject);
          cells[3].firstChild.nodeValue = updateObject.qc_email;
          cells[4].firstChild.nodeValue = updateObject.alternate_email;
          cells[5].firstChild.nodeValue = generatePhoneString(updateObject);
          cells[6].firstChild.nodeValue = generateAddressString(updateObject);
        }

        //  Update the database
        requestObject = new XMLHttpRequest();
        requestObject.open('POST', './scripts/manage_people.php', true);
        requestObject.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
        var requestType = addingPerson ? "insertRequest" : "updateRequest";
        requestObject.send(requestType+"="+JSON.stringify(updateObject));
        requestObject.onreadystatechange = updateStateChangeHandler;
        if (updateObject.id !== 0) undoList[updateObject.id].push(updateObject);

      };

      //  Manage Events While Editing Panel Is Active
      //  ============================================================================================================

      //  editCheckboxListener()
      //  ------------------------------------------------------------------------------------------------------------
      /*  Enforce the following rules: isFaculty is mutually exclusive to all others. isFaculty, isUndergraduate, and
       *  isGraduate are mutually exclusive with one another. isEvening and isForeign may be specified in addition to
       *  either isUndergraduate or isGraduate, but not separately. Boxes are processed on any change from left to
       *  right.
       */
      var editCheckboxListener = function(evt)
      {
        evt = evt || window.event;

        if (!this.checked) { return; }
        switch (this)
        {
          case editFacultyBox:
            editUndergraduateBox.checked = false;
            editGraduateBox.checked = false;
            editEveningBox.checked = false;
            editForeignBox.checked = false;
            editFacultyDepartmentSelect.parentNode.style.display = 'table-row';
            editFirstUndergraduateMajorSelect.parentNode.style.display = 'none';
            editSecondUndergraduateMajorSelect.parentNode.style.display = 'none';
            editGraduateMajorSelect.parentNode.style.display = 'none';
            break;
          case editUndergraduateBox:
            editFacultyBox.checked = false;
            editInstructionalBox.checked = false;
            editGraduateBox.checked = false;
            editFirstUndergraduateMajorSelect.parentNode.style.display = 'table-row';
            editSecondUndergraduateMajorSelect.parentNode.style.display = 'table-row';
            editFacultyDepartmentSelect.parentNode.style.display = 'none';
            editGraduateMajorSelect.parentNode.style.display = 'none';
            break;
          case editGraduateBox:
            editFacultyBox.checked = false;
            editInstructionalBox.checked = false;
            editUndergraduateBox.checked = false;
            editGraduateMajorSelect.parentNode.style.display = 'table-row';
            editFacultyDepartmentSelect.parentNode.style.display = 'none';
            editFirstUndergraduateMajorSelect.parentNode.style.display = 'none';
            editSecondUndergraduateMajorSelect.parentNode.style.display = 'none';
            break;
          case editEveningBox:
          case editForeignBox:
            editFacultyBox.checked = false;
            editInstructionalBox.checked = false;
            editFacultyDepartmentSelect.parentNode.style.display = 'none';
        }
      };

      //  stopPropagation()
      //  ----------------------------------------------------------------------
      /*  If a user tries to scroll one of the select lists in the edit panel,
       *  don't let it pass on to the panel drag handler. Likewise if they need
       *  to select content in a text input.
       */
      var stopPropagation = function(evt)
      {
        evt = evt || window.event;
        Core.stopPropagation(evt);
      };

      //  editMousedownListener() and editMouseupListener(): Drag edit panel.
      //  ---------------------------------------------------------------------------------------------------
      var mouseStartX, mouseStartY;
      var editMousemoveHandler = function(evt)
      {
        evt = evt || window.event;
        var deltaX = evt.screenX - mouseStartX;
        var deltaY = evt.screenY - mouseStartY;
        var newLeft = editFormStartX + deltaX;
        var newTop  = editFormStartY + deltaY;
        editForm.style.left = newLeft + 'px';
        editForm.style.top = newTop + 'px';
      };
      var editMousedownListener = function(evt)
      {
        //  Capture current cooridinates
        editFormStartX = editForm.offsetLeft;
        editFormStartY = editForm.offsetTop;
        mouseStartX = evt.screenX;
        mouseStartY = evt.screenY;
        bodyElement.style.cursor = 'move';
        Core.addEventListener(editForm, 'mousemove', editMousemoveHandler);
      };
      var editMouseupListener = function(evt)
      {
        Core.removeEventListener(editForm, 'mousemove', editMousemoveHandler);
        bodyElement.style.cursor = 'default';
      };

      //  documentKeyupListener()
      //  ---------------------------------------------------------------------------------------------------
      /*  If user types Esc while the editForm is active, cancel the edit operation.
       *  TODO Ctrl-Z is to populate the form with the top of the undoList, if there is
       *  anything there, and Shift-Ctrl-Z is to undo Ctrl-Z.
       */
      var  documentKeyupListener = function(evt)
      {
        evt = evt || window.event;
        if ( (evt.keyCode == 27) && (rowBeingEdited || addingPerson) )
        {
          cancelButtonListener(evt);
        }
      };

      //  Resize column widths
      //  -------------------------------------------------------------------------------------------------------------
      /*  The following three functions allow dragging in the heading for each column to change its width.  Because the
       *  table is laid out by the browser, resizing a column will affect the widths of all other columns. A more useful
       *  design would allow the user to drag the edge of a column into or out of the space occupied by its neighbor.
       *  This implementation, however, makes a column wider if you drag right or smaller if you drag left, which is not
       *  always inuitive.
       *  Works in Firefox and Safari. Ignored in Opera. IE is too messed up to test it (??)
       */
      var lastX;
      var colMouseMoveListener = function(evt)
      {
        evt = evt || window.event;
        var deltaX = evt.screenX - lastX;
        bodyElement.style.cursor = (deltaX > 0) ? 'e-resize' : 'w-resize';
        lastX = evt.screenX;
        var newWidth = colBeingResized.style.width.substring(0,colBeingResized.style.width.length - 2) - 0 + deltaX;
        colBeingResized.style.width = newWidth + "px";
      };
      var colMousedownListener = function(evt)
      {
        evt = evt || window.event;
        colBeingResized = this;
        //  Need to initialize the style.width with a property value string representing the current width of
        //  the th. I got this rhs from:
        //  http://www.csscripting.com/css-multi-column/dom-width-height.php
        colBeingResized.style.width = document.defaultView.getComputedStyle(this,"").getPropertyValue("width");
        lastX = evt.screenX;
        Core.addEventListener(document, 'mousemove', colMouseMoveListener);
        Core.preventDefault(evt); //  So you don't select stuff while dragging.
      };
      var colMouseupListner = function(evt)
      {
        evt = evt || window.event;
        if (colBeingResized)
        {
          bodyElement.style.cursor= 'default';
          Core.removeEventListener(document, 'mousemove', colMouseMoveListener);
          colBeingResized = null;
        }
      };

      return {
        init: function()
        {
          bodyElement = document.getElementsByTagName('body')[0];
          searchForm = document.getElementById('search-form');
          Core.addEventListener(searchForm, 'submit', dontSubmit);
          searchText = document.getElementById('search-text');
          Core.addEventListener(searchText, 'change', doSearch);
//          Core.addEventListener(searchText, 'blur', doSearch);
          Core.addEventListener(searchText, 'keyup', searchKeyupListener);
          searchText.focus();

          searchFacultyBox = document.getElementById('searchFacultyBox');
          searchNoninstructionalFacultyBox = document.getElementById('searchNoninstructionalFacultyBox');
          searchUndergraduateBox = document.getElementById('searchUndergraduateBox');
          searchGraduateBox = document.getElementById('searchGraduateBox');
          searchEveningBox = document.getElementById('searchEveningBox');
          searchForeignBox = document.getElementById('searchForeignBox');

          editForm = document.getElementById('edit-form');
          personIdMsg = document.getElementById('person-id-msg');
          numEditsMsg = document.getElementById('num-undo-msg');
          editFacultyBox = document.getElementById('editFacultyBox');
          editInstructionalBox = document.getElementById('editInstructionalBox');
          editUndergraduateBox = document.getElementById('editUndergraduateBox');
          editGraduateBox = document.getElementById('editGraduateBox');
          editEveningBox = document.getElementById('editEveningBox');
          editForeignBox = document.getElementById('editForeignBox');

          editStudentSpecificFieldset = document.getElementById('editStudentSpecificInfo');
          editStudentIdText = document.getElementById('editStudentIdText');
          editStudentVerifiedText = document.getElementById('editStudentVerifiedText');
          editFirstNameText = document.getElementById('editFirstNameText');
          editLastNameText = document.getElementById('editLastNameText');
          editQCEmailText = document.getElementById('editQCEmailText');
          editAlternateEmailText = document.getElementById('editAlternateEmailText');
          editCellPhoneText = document.getElementById('editCellPhoneText');
          editWorkPhoneText = document.getElementById('editWorkPhoneText');
          editHomePhoneText = document.getElementById('editHomePhoneText');
          editWorkAddressText = document.getElementById('editWorkAddressText');
          editHomeAddressText = document.getElementById('editHomeAddressText');
          editFacultyDepartmentSelect = document.getElementById('editFacultyDepartmentSelect');
          editFirstUndergraduateMajorSelect = document.getElementById('editFirstUndergraduateMajorSelect');
          editSecondUndergraduateMajorSelect = document.getElementById('editSecondUndergraduateMajorSelect');
          editGraduateMajorSelect = document.getElementById('editGraduateMajorSelect');
          editCommitButton = document.getElementById('editCommitButton');
          editCancelButton = document.getElementById('editCancelButton');

          resultsTable = document.getElementById('results-table');
          resultsCols = resultsTable.getElementsByTagName('th');
          resultsTableBody = document.getElementsByTagName('tbody')[0];

          messageDiv = document.getElementById('message-div');

          Core.addEventListener(editForm,                           'mousedown',  editMousedownListener);
          Core.addEventListener(editForm,                           'mouseup',    editMouseupListener);
          Core.addEventListener(editFacultyBox,                     'change',     editCheckboxListener);
          Core.addEventListener(editInstructionalBox,               'change',     editCheckboxListener);
          Core.addEventListener(editUndergraduateBox,               'change',     editCheckboxListener);
          Core.addEventListener(editGraduateBox,                    'change',     editCheckboxListener);
          Core.addEventListener(editEveningBox,                     'change',     editCheckboxListener);
          Core.addEventListener(editForeignBox,                     'change',     editCheckboxListener);
          //  Allow user to select text inputs when editing (prevent panel dragging)
          Core.addEventListener(editFirstNameText,                  'mousedown',  stopPropagation);
          Core.addEventListener(editLastNameText,                   'mousedown',  stopPropagation);
          Core.addEventListener(editQCEmailText,                    'mousedown',  stopPropagation);
          Core.addEventListener(editAlternateEmailText,             'mousedown',  stopPropagation);
          Core.addEventListener(editCellPhoneText,                  'mousedown',  stopPropagation);
          Core.addEventListener(editWorkPhoneText,                  'mousedown',  stopPropagation);
          Core.addEventListener(editHomePhoneText,                  'mousedown',  stopPropagation);
          Core.addEventListener(editWorkAddressText,                'mousedown',  stopPropagation);
          Core.addEventListener(editHomeAddressText,                'mousedown',  stopPropagation);
          //  Allow user to navigate selects with editing (prevent panel dragging)
          Core.addEventListener(editFacultyDepartmentSelect,        'mousemove',  stopPropagation);
          Core.addEventListener(editFirstUndergraduateMajorSelect,  'mousemove',  stopPropagation);
          Core.addEventListener(editSecondUndergraduateMajorSelect, 'mousemove',  stopPropagation);
          Core.addEventListener(editGraduateMajorSelect,            'mousemove',  stopPropagation);

          Core.addEventListener(document, 'keyup', documentKeyupListener);
          editCommitButton.onclick = commitButtonHandler;
          Core.addEventListener(editCancelButton, 'click', cancelButtonListener);

          for (var i=0; i< resultsCols.length; i++)
          {
            Core.addEventListener(resultsCols[i], 'mousedown', colMousedownListener);
          }
          Core.addEventListener(document, 'mouseup', colMouseupListner);
        }
      };
    }
  )()
);

