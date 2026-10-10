'use strict';

// EventDesk individual frontend — use with the group's shared PHP API on localhost.
// Role selection is a DEMO VIEW, not authentication or an authorization mechanism.
const API_BASE = new URL('..', window.location.href).pathname.replace(/\/$/, '');
const LOCAL_HOST = ['localhost', '127.0.0.1', '::1'].includes(location.hostname);
const $ = id => document.getElementById(id);
const state = {
  role: 'ADMIN', users: [], venues: [], events: [], bookings: [],
  actors: { ORGANISER: null, CUSTOMER: null },
  manageUser: null, manageVenue: null, manageEvent: null,
  knownEmails: {}, busy: false
};
const esc = input => String(input ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = x => Number(x) || 0;
const money = value => 'RM ' + num(value).toFixed(2);
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function futureDay(days = 21) {
  const d = new Date(); d.setDate(d.getDate()+days);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function shortTime(s) { return String(s ?? '').slice(0,5); }
function fullTime(s) { return /^\d\d:\d\d$/.test(String(s)) ? s+':00' : s; }
function formatDate(s) {
  const parts = String(s||'').split('-').map(Number);
  if (parts.length!==3 || parts.some(x=>!x)) return String(s ?? '');
  return new Date(parts[0],parts[1]-1,parts[2]).toLocaleDateString('en-MY',{day:'numeric',month:'short',year:'numeric'});
}
function tag(value) {
  const v = String(value ?? '').toUpperCase();
  const special = v==='PENDING'?'pending':v==='CANCELLED'?'cancelled':v==='INACTIVE'?'inactive':v==='COMPLETED'?'completed':v==='ORGANISER'?'organiser':v==='ADMIN'?'admin':'';
  return `<span class="badge ${special}">${esc(v)}</span>`;
}
function stats(items) { return items.map(([label,value,sub])=>`<div class="stat"><div class="stat-label">${esc(label)}</div><div class="stat-number">${esc(value)}</div><div class="stat-sub">${esc(sub)}</div></div>`).join(''); }
function empty(text='No records to display.') { return `<p class="empty-inline">${esc(text)}</p>`; }
function table(headers, rows, message) {
  if (!rows.length) return empty(message);
  return `<table class="data-table"><thead><tr>${headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(cols=>`<tr>${cols.map(col=>`<td>${col}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function notify(id,message,type='success') {
  const el=$(id); if (!el) return;
  el.textContent=message;
  el.className=`form-message ${type}`;
}
async function request(method, endpoint, body) {
  if (!LOCAL_HOST && method!=='GET') throw Error('Changes are restricted to localhost until JWT security is integrated.');
  const response = await fetch(`${API_BASE}/${endpoint}`,{
    method, cache:'no-store',
    headers:{ 'Accept':'application/json',...(body ? {'Content-Type':'application/json'} : {})},
    ...(body ? {body:JSON.stringify(body)} : {})
  });
  const raw=await response.text(); let payload;
  try {payload=JSON.parse(raw);} catch {throw Error(`The ${endpoint} endpoint did not return JSON. Check XAMPP and the API folder.`);}
  if (!response.ok) throw Error(`${response.status}: ${payload.error || payload.message || 'Request failed'}`);
  return payload;
}
async function loadAll(quiet=false) {
  if(!quiet){$('globalNotice').textContent='Loading data from the API...'; $('globalNotice').className='notice';}
  try {
    const results = await Promise.all(['users','venues','events','bookings'].map(n=>request('GET',n)));
    [state.users,state.venues,state.events,state.bookings]=results.map((r,i)=>{
      if(!Array.isArray(r.data)) throw Error(`Invalid response from ${['users','venues','events','bookings'][i]} API`);
      return r.data;
    });
    for (const role of ['ORGANISER','CUSTOMER']) {
      const available=state.users.filter(u=>u.role===role);
      if (!available.some(u=>num(u.user_id)===state.actors[role])) state.actors[role]=available.length?num(available[0].user_id):null;
    }
    render();
    $('globalNotice').textContent='Connected successfully · Data loaded from the shared PHP/MySQL REST APIs.';
    $('globalNotice').className='notice success';
  } catch(e) { $('globalNotice').textContent='Connection problem: '+e.message; $('globalNotice').className='notice error'; }
}
async function submitAction(form, messageId, fn) {
  if(state.busy)return;
  const buttons=Array.from(form?.querySelectorAll('button')||[]); state.busy=true;
  buttons.forEach(b=>b.disabled=true); notify(messageId,'Working...','');
  try {await fn();} catch(e){notify(messageId,e.message,'error');}
  finally {
    state.busy=false;
    const selectionValid = form?.id==='userEditForm' ? Boolean(state.manageUser)
      : form?.id==='venueEditForm' ? Boolean(state.manageVenue)
      : form?.id==='eventEditForm' ? Boolean(state.manageEvent) : true;
    buttons.forEach(b=>b.disabled=!selectionValid);
  }
}
function optionList(select, items, placeholder, selectedId, labelFn, idKey) {
  const valid=items.some(x=>num(x[idKey])===num(selectedId));
  const selected=valid?num(selectedId):(items.length?num(items[0][idKey]):null);
  select.replaceChildren();
  if(!items.length){const o=new Option(placeholder,'');select.add(o);select.value='';return null;}
  for(const item of items){ const o=new Option(labelFn(item),String(item[idKey])); select.add(o); }
  select.value=String(selected);
  return selected;
}
function render() {
  for(const b of $('roleTabs').querySelectorAll('button')) b.setAttribute('aria-pressed',String(b.dataset.role===state.role));
  $('adminView').hidden=state.role!=='ADMIN';
  $('organiserView').hidden=state.role!=='ORGANISER';
  $('customerView').hidden=state.role!=='CUSTOMER';
  const titles={ADMIN:['Administrator dashboard','Manage users, venues and system records.'],ORGANISER:['Organiser dashboard','Create events and manage event bookings.'],CUSTOMER:['Customer dashboard','Find events, reserve tickets and manage your bookings.']};
  $('roleHeading').textContent=titles[state.role][0]; $('roleDescription').textContent=titles[state.role][1];
  const actor=$('actorPicker'); actor.hidden=state.role==='ADMIN';
  if(state.role!=='ADMIN') {
    const role=state.role, candidates=state.users.filter(u=>u.role===role);
    $('actorLabel').textContent=role==='CUSTOMER'?'Customer account':'Organiser account';
    state.actors[role]=optionList($('actorSelect'),candidates,'No '+role.toLowerCase()+' account',state.actors[role],u=>`${u.name} (ID ${u.user_id})`,'user_id');
  }
  renderAdmin(); renderOrganiser(); renderCustomer();
}
function renderAdmin() {
  $('adminStats').innerHTML=stats([['Registered users',state.users.length,'Across all roles'],['Active venues',state.venues.filter(v=>v.status==='ACTIVE').length,`${state.venues.length} venues total`],['Total bookings',state.bookings.length,'Including cancellations']]);
  $('usersTable').innerHTML=table(['ID','Name','Role'],state.users.map(u=>[esc(u.user_id),esc(u.name),tag(u.role)]));
  $('venuesTable').innerHTML=table(['Venue','Location','Capacity','Status'],state.venues.map(v=>[esc(v.venue_name),esc(v.location),esc(v.capacity),tag(v.status)]));
  $('allBookingsTable').innerHTML=table(['Booking','Customer','Event','Tickets','Total','Status'],state.bookings.map(b=>[esc(b.booking_id),esc(b.customer_name||state.users.find(u=>num(u.user_id)===num(b.user_id))?.name||'User '+b.user_id),esc(b.event_name||state.events.find(e=>num(e.event_id)===num(b.event_id))?.event_name||b.event_id),esc(b.quantity),money(b.total_price),tag(b.booking_status)]));
  const users=state.users.filter(u=>u.role==='CUSTOMER'&&num(u.user_id)>5);
  state.manageUser=optionList($('manageUserId'),users,'Create a customer first',state.manageUser,u=>`${u.name} (ID ${u.user_id})`,'user_id');
  fillUser();
  const venues=state.venues.filter(v=>num(v.venue_id)>5);
  state.manageVenue=optionList($('manageVenueId'),venues,'Create a venue first',state.manageVenue,v=>`${v.venue_name} (ID ${v.venue_id})`,'venue_id');
  fillVenue();
}
function fillUser() {
  const u=state.users.find(u=>num(u.user_id)===state.manageUser);
  const f=$('userEditForm'); f.elements.name.value=u?.name||'';
  f.elements.email.value=u?state.knownEmails[u.user_id]||'':'';
  f.querySelector('[type="submit"]').disabled=!u;
  $('deleteUserBtn').disabled=!u;
}
function fillVenue() {
  const v=state.venues.find(v=>num(v.venue_id)===state.manageVenue);
  const f=$('venueEditForm');
  for(const key of ['venue_name','location','capacity'])f.elements[key].value=v?.[key]??'';
  f.elements.status.value=v?.status||'ACTIVE';
  f.querySelector('[type="submit"]').disabled=!v;
  $('deleteVenueBtn').disabled=!v;
}
function reserved(eventId){return state.bookings.filter(b=>num(b.event_id)===num(eventId)&&['PENDING','CONFIRMED'].includes(b.booking_status)).reduce((sum,b)=>sum+num(b.quantity),0);}
function available(e){return Math.max(0,num(e.ticket_quantity)-reserved(e.event_id));}
function isBookable(e){return e.status==='ACTIVE'&&String(e.event_date)>=today()&&available(e)>0;}
function actorUser(){return state.users.find(u=>num(u.user_id)===state.actors[state.role]);}
function renderOrganiser() {
  const id=state.actors.ORGANISER;
  const events=state.events.filter(e=>num(e.organiser_id)===id);
  const eventIds=new Set(events.map(e=>num(e.event_id)));
  const bookings=state.bookings.filter(b=>eventIds.has(num(b.event_id)));
  $('organiserStats').innerHTML=stats([['My events',events.length,'Events I organise'],['Total reservations',bookings.length,'Across my events'],['Pending approvals',bookings.filter(b=>b.booking_status==='PENDING').length,'Awaiting confirmation']]);
  $('organiserEventsTable').innerHTML=table(['Event','Date','Venue','Price','Available','Status'],events.map(e=>[esc(e.event_name),formatDate(e.event_date),esc(state.venues.find(v=>num(v.venue_id)===num(e.venue_id))?.venue_name||'—'),money(e.ticket_price),esc(available(e)),tag(e.status)]),'No events assigned to this organiser.');
  for(const select of document.querySelectorAll('.active-venue-select')) {
    const old=select.value;
    const active=state.venues.filter(v=>v.status==='ACTIVE');
    optionList(select,active,'No active venue available',old||active[0]?.venue_id,v=>`${v.venue_name} (capacity ${v.capacity})`,'venue_id');
  }
  const manageable=events.filter(e=>num(e.event_id)>5);
  state.manageEvent=optionList($('manageEventId'),manageable,'Create an event first',state.manageEvent,e=>`${e.event_name} (ID ${e.event_id})`,'event_id');
  fillEvent();
  $('organiserBookingsTable').innerHTML=table(['Booking','Customer','Event','Quantity','Status','Action'],bookings.map(b=>{
    const e=state.events.find(e=>num(e.event_id)===num(b.event_id));
    const canConfirm=b.booking_status==='PENDING'&&e?.status==='ACTIVE'&&e?.event_date>=today();
    return [esc(b.booking_id),esc(b.customer_name||state.users.find(u=>num(u.user_id)===num(b.user_id))?.name||b.user_id),esc(e?.event_name||b.event_id),esc(b.quantity),tag(b.booking_status),canConfirm?`<button type="button" class="btn btn-sm" data-confirm-booking="${esc(b.booking_id)}">Confirm</button>`:'—'];
  }),'No bookings for these events.');
}
function fillEvent() {
  const e=state.events.find(e=>num(e.event_id)===state.manageEvent);
  const f=$('eventEditForm');
  for(const key of ['event_name','event_date','ticket_price','ticket_quantity','description']) f.elements[key].value=e?.[key]??'';
  f.elements.start_time.value=shortTime(e?.start_time);
  f.elements.end_time.value=shortTime(e?.end_time);
  f.elements.venue_id.value=e?String(e.venue_id):f.elements.venue_id.value;
  f.elements.status.value=e?.status||'ACTIVE';
  f.querySelector('[type="submit"]').disabled=!e;
  $('deleteEventBtn').disabled=!e;
}
function renderCustomer() {
  const userId=state.actors.CUSTOMER;
  const myBookings=state.bookings.filter(b=>num(b.user_id)===userId);
  $('customerStats').innerHTML=stats([['Available events',state.events.filter(isBookable).length,'Upcoming events with tickets'],['My bookings',myBookings.length,'Booking history'],['Active bookings',myBookings.filter(b=>b.booking_status!=='CANCELLED').length,'Pending or confirmed']]);
  renderEventCards();
  $('customerBookingsTable').innerHTML=table(['Booking','Event','Tickets','Price','Status','Action'],myBookings.map(b=>{
    const e=state.events.find(e=>num(e.event_id)===num(b.event_id));
    const canCancel=['PENDING','CONFIRMED'].includes(b.booking_status)&&e?.event_date>=today();
    return [esc(b.booking_id),esc(b.event_name||e?.event_name||b.event_id),esc(b.quantity),money(b.total_price),tag(b.booking_status),canCancel?`<button type="button" class="btn btn-sm btn-danger" data-cancel-booking="${esc(b.booking_id)}">Cancel booking</button>`:'—'];
  }),'No bookings for this customer.');
}
function renderEventCards() {
  const search=$('eventSearch').value.trim().toLowerCase();
  const onlyAvailable=$('eventFilter').value==='AVAILABLE';
  const events=state.events.filter(e=>{
    const venue=state.venues.find(v=>num(v.venue_id)===num(e.venue_id));
    const matched=(`${e.event_name} ${venue?.venue_name||''} ${venue?.location||''}`).toLowerCase().includes(search);
    return matched&&(!onlyAvailable||isBookable(e));
  });
  $('eventCards').innerHTML=events.map(e=>{
    const venue=state.venues.find(v=>num(v.venue_id)===num(e.venue_id));
    const canBook=isBookable(e) && !!state.actors.CUSTOMER;
    return `<article class="event-tile"><div>${tag(e.status)}</div><div class="event-title">${esc(e.event_name)}</div><p>${esc(formatDate(e.event_date))} · ${esc(shortTime(e.start_time))}–${esc(shortTime(e.end_time))}</p><p>${esc(venue?.venue_name||'Venue not found')} · ${esc(venue?.location||'')}</p><div class="event-meta"><strong>${money(e.ticket_price)}</strong> per ticket · <strong>${esc(available(e))}</strong> available</div><div class="booking-control"><label>Tickets<input type="number" min="1" max="${Math.max(1,available(e))}" value="1" id="qty-${num(e.event_id)}" ${canBook?'':'disabled'}></label><button type="button" class="btn btn-primary" data-book-event="${num(e.event_id)}" ${canBook?'':'disabled'}>${canBook?'Book tickets':'Unavailable'}</button></div></article>`;
  }).join('')||empty('No events match this search.');
}
function eventData(form,organiserId){
  const f=form.elements;
  const payload={organiser_id:organiserId,venue_id:num(f.venue_id.value),event_name:f.event_name.value.trim(),description:f.description.value.trim(),event_date:f.event_date.value,start_time:fullTime(f.start_time.value),end_time:fullTime(f.end_time.value),ticket_price:Number(f.ticket_price.value),ticket_quantity:Number(f.ticket_quantity.value),status:f.status.value};
  if(payload.event_date<today())throw Error('Choose today or a future event date.');
  if(payload.end_time<=payload.start_time)throw Error('End time must be later than start time.');
  const venue=state.venues.find(v=>num(v.venue_id)===payload.venue_id);
  if(!venue||venue.status!=='ACTIVE')throw Error('Choose an active venue.');
  if(payload.ticket_quantity>num(venue.capacity))throw Error(`Ticket allocation cannot exceed venue capacity (${venue.capacity}).`);
  if(!Number.isInteger(payload.ticket_quantity)||payload.ticket_quantity<1)throw Error('Ticket quantity must be a positive whole number.');
  if(!Number.isFinite(payload.ticket_price)||payload.ticket_price<0)throw Error('Price must be zero or greater.');
  return payload;
}
function setRole(role){if(!['ADMIN','ORGANISER','CUSTOMER'].includes(role))return; state.role=role;render();window.scrollTo({top:125,behavior:'smooth'});}
$('roleTabs').addEventListener('click',e=>{const b=e.target.closest('[data-role]');if(b)setRole(b.dataset.role);});
$('actorSelect').addEventListener('change',e=>{state.actors[state.role]=num(e.target.value)||null;render();});
$('refreshBtn').addEventListener('click',()=>loadAll());
$('manageUserId').addEventListener('change',e=>{state.manageUser=num(e.target.value)||null;fillUser();});
$('manageVenueId').addEventListener('change',e=>{state.manageVenue=num(e.target.value)||null;fillVenue();});
$('manageEventId').addEventListener('change',e=>{state.manageEvent=num(e.target.value)||null;fillEvent();});
$('eventSearch').addEventListener('input',renderEventCards);
$('eventFilter').addEventListener('change',renderEventCards);
$('registerForm').addEventListener('submit',e=>{
  e.preventDefault(); const form=e.currentTarget;
  submitAction(form,'registerMessage',async()=>{
    const payload={name:form.elements.name.value.trim(),email:form.elements.email.value.trim(),password:form.elements.password.value};
    const result=await request('POST','users',payload);
    const id=num(result.data?.user_id);
    state.knownEmails[id]=payload.email;
    form.reset();
    state.manageUser=id; state.actors.CUSTOMER=id;
    await loadAll(true);
    notify('registerMessage',`Customer created successfully (ID ${id}). You can now select this account on the Customer dashboard.`);
  });
});
$('userEditForm').addEventListener('submit',e=>{
  e.preventDefault(); const f=e.currentTarget; const id=state.manageUser;
  submitAction(f,'userEditMessage',async()=>{
    if(!id||id<=5)throw Error('Select a demonstration customer.');
    const name=f.elements.name.value.trim(),email=f.elements.email.value.trim();
    await request('PUT',`users/${id}`,{name,email});
    state.knownEmails[id]=email;
    await loadAll(true); notify('userEditMessage',`Customer ${id} updated successfully.`);
  });
});
$('deleteUserBtn').addEventListener('click',()=>{
  const id=state.manageUser;const user=state.users.find(u=>num(u.user_id)===id);
  if(!user||id<=5)return;
  if(!confirm(`Delete customer ${user.name} (ID ${id}) permanently?`))return;
  submitAction($('userEditForm'),'userEditMessage',async()=>{
    await request('DELETE',`users/${id}`);
    state.manageUser=null;
    delete state.knownEmails[id];
    await loadAll(true);notify('userEditMessage',`Customer ${id} deleted successfully.`);
  });
});
$('venueCreateForm').addEventListener('submit',e=>{
  e.preventDefault();const f=e.currentTarget;
  submitAction(f,'venueCreateMessage',async()=>{
    const payload={venue_name:f.elements.venue_name.value.trim(),location:f.elements.location.value.trim(),capacity:Number(f.elements.capacity.value),status:f.elements.status.value};
    const r=await request('POST','venues',payload);
    state.manageVenue=num(r.data?.venue_id);f.reset();
    await loadAll(true);notify('venueCreateMessage',`Venue created successfully (ID ${state.manageVenue}).`);
  });
});
$('venueEditForm').addEventListener('submit',e=>{
  e.preventDefault();const f=e.currentTarget;const id=state.manageVenue;
  submitAction(f,'venueEditMessage',async()=>{
    if(!id||id<=5)throw Error('Select a demonstration venue.');
    const payload={venue_name:f.elements.venue_name.value.trim(),location:f.elements.location.value.trim(),capacity:Number(f.elements.capacity.value),status:f.elements.status.value};
    await request('PUT',`venues/${id}`,payload); await loadAll(true);notify('venueEditMessage',`Venue ${id} updated successfully.`);
  });
});
$('deleteVenueBtn').addEventListener('click',()=>{
  const id=state.manageVenue; const v=state.venues.find(v=>num(v.venue_id)===id);if(!v||id<=5)return;
  if(!confirm(`Delete venue ${v.venue_name} (ID ${id}) permanently?`))return;
  submitAction($('venueEditForm'),'venueEditMessage',async()=>{
    await request('DELETE',`venues/${id}`);state.manageVenue=null;await loadAll(true);notify('venueEditMessage',`Venue ${id} deleted successfully.`);
  });
});
$('eventCreateForm').elements.event_date.min=today();
$('eventCreateForm').elements.event_date.value=futureDay();
$('eventCreateForm').addEventListener('submit',e=>{
  e.preventDefault();const f=e.currentTarget;
  submitAction(f,'eventCreateMessage',async()=>{
    const id=state.actors.ORGANISER;if(!id)throw Error('Select an organiser.');
    const payload=eventData(f,id);
    const r=await request('POST','events',payload);
    state.manageEvent=num(r.data?.event_id);
    f.reset();f.elements.event_date.value=futureDay();f.elements.start_time.value='09:00';f.elements.end_time.value='17:00';f.elements.ticket_price.value='20.00';f.elements.ticket_quantity.value='100';
    await loadAll(true);notify('eventCreateMessage',`Event created successfully (ID ${state.manageEvent}).`);
  });
});
$('eventEditForm').addEventListener('submit',e=>{
  e.preventDefault();const f=e.currentTarget;const id=state.manageEvent;
  submitAction(f,'eventEditMessage',async()=>{
    const current=state.events.find(x=>num(x.event_id)===id);
    if(!current||id<=5||num(current.organiser_id)!==state.actors.ORGANISER)throw Error('Select your demonstration event.');
    const payload=eventData(f,state.actors.ORGANISER);
    if(payload.ticket_quantity<reserved(id))throw Error('Ticket quantity cannot be less than existing active reservations.');
    await request('PUT',`events/${id}`,payload);await loadAll(true);notify('eventEditMessage',`Event ${id} updated successfully.`);
  });
});
$('deleteEventBtn').addEventListener('click',()=>{
  const id=state.manageEvent;const e=state.events.find(e=>num(e.event_id)===id);if(!e||id<=5||num(e.organiser_id)!==state.actors.ORGANISER)return;
  if(!confirm(`Delete event ${e.event_name} (ID ${id}) permanently?`))return;
  submitAction($('eventEditForm'),'eventEditMessage',async()=>{
    await request('DELETE',`events/${id}`);state.manageEvent=null;await loadAll(true);notify('eventEditMessage',`Event ${id} deleted successfully.`);
  });
});
$('organiserBookingsTable').addEventListener('click',e=>{
  const b=e.target.closest('[data-confirm-booking]'); if(!b)return;
  const id=num(b.dataset.confirmBooking);const booking=state.bookings.find(b=>num(b.booking_id)===id);
  const event=state.events.find(e=>num(e.event_id)===num(booking?.event_id));
  if(!booking||!event||num(event.organiser_id)!==state.actors.ORGANISER)return;
  if(!confirm(`Confirm booking #${id} for ${event.event_name}?`))return;
  submitAction(null,'organiserBookingMessage',async()=>{await request('PUT',`bookings/${id}`,{booking_status:'CONFIRMED'});await loadAll(true);notify('organiserBookingMessage',`Booking #${id} confirmed.`);});
});
$('eventCards').addEventListener('click',e=>{
  const button=e.target.closest('[data-book-event]');if(!button)return;
  const eventId=num(button.dataset.bookEvent),event=state.events.find(e=>num(e.event_id)===eventId),userId=state.actors.CUSTOMER;
  if(!event||!userId)return;
  const quantity=Number($(`qty-${eventId}`)?.value);
  if(!Number.isInteger(quantity)||quantity<1||quantity>available(event))return notify('customerBookMessage','Enter a valid ticket quantity within availability.','error');
  if(!confirm(`Book ${quantity} ticket(s) for ${event.event_name}? Total ${money(num(event.ticket_price)*quantity)}.`))return;
  submitAction(null,'customerBookMessage',async()=>{const r=await request('POST','bookings',{user_id:userId,event_id:eventId,quantity});await loadAll(true);notify('customerBookMessage',`Booking #${r.data?.booking_id} created · ${money(r.data?.total_price)} · ${r.data?.booking_status}.`);});
});
$('customerBookingsTable').addEventListener('click',e=>{
  const button=e.target.closest('[data-cancel-booking]');if(!button)return;
  const id=num(button.dataset.cancelBooking),booking=state.bookings.find(b=>num(b.booking_id)===id);
  if(!booking||num(booking.user_id)!==state.actors.CUSTOMER)return;
  if(!confirm(`Cancel booking #${id}? The record will remain as CANCELLED.`))return;
  submitAction(null,'customerCancelMessage',async()=>{await request('DELETE',`bookings/${id}`);await loadAll(true);notify('customerCancelMessage',`Booking #${id} cancelled. Its record is retained.`);});
});
loadAll();
