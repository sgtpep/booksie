export default () =>
  addEventListener(
    'click',
    event =>
      !event.target.hostname ||
      event.target.hostname === location.hostname ||
      event.target.hostname.endsWith(`.${location.hostname}`) ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      confirm(`Follow this link?\n${event.target.href}`) ||
      event.preventDefault()
  );
