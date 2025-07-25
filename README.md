## Soma Capital Technical Assessment

This is a technical assessment as part of the interview process for Soma Capital.

> [!IMPORTANT]  
> You will need a Pexels API key to complete the technical assessment portion of the application. You can sign up for a free API key at https://www.pexels.com/api/  

To begin, clone this repository to your local machine.

## Development

This is a [NextJS](https://nextjs.org) app, with a SQLite based backend, intended to be run with the LTS version of Node.

To run the development server:

```bash
npm i
npm run dev
```

## Task:

Modify the code to add support for due dates, image previews, and task dependencies.

### Part 1: Due Dates 

When a new task is created, users should be able to set a due date.

When showing the task list is shown, it must display the due date, and if the date is past the current time, the due date should be in red.

### Part 2: Image Generation 

When a todo is created, search for and display a relevant image to visualize the task to be done. 

To do this, make a request to the [Pexels API](https://www.pexels.com/api/) using the task description as a search query. Display the returned image to the user within the appropriate todo item. While the image is being loaded, indicate a loading state.

You will need to sign up for a free Pexels API key to make the fetch request. 

### Part 3: Task Dependencies

Implement a task dependency system that allows tasks to depend on other tasks. The system must:

1. Allow tasks to have multiple dependencies
2. Prevent circular dependencies
3. Show the critical path
4. Calculate the earliest possible start date for each task based on its dependencies
5. Visualize the dependency graph

## Submission:

1. Add a new "Solution" section to this README with a description and screenshot or recording of your solution. 
2. Push your changes to a public GitHub repository.
3. Submit a link to your repository in the application form.

Thanks for your time and effort. We'll be in touch soon!



## Solution

This task dependency system enables users to create tasks, assign due dates, set dependencies, and visualize the critical path in a clean and intuitive UI. The system auto-computes each task’s **earliest start** time based on dependencies and highlights the **critical path** using red edges and borders.

###  Features

-  Add new tasks with due dates and optional images from Pexels
-  While the image is being fetched, a loading spinner is displayed for better UX
-  Assign dependencies to tasks using checkboxes
-  Automatically calculate **earliest start** dates based on task dependencies
-  Highlight the **critical path** visually
-  Past-due tasks are clearly indicated in red
-  Real-time interactive **dependency graph** rendered with React Flow

### Setup Notes

To run the app locally, create a `.env.local` file at the root of the project with the following:

```env
PEXELS_API_KEY=your_pexels_api_key_here
```

### 🎥 Demo Video


[Click here to watch the demo video](https://drive.google.com/file/d/1T8_nu_HuKo2DDqWq77n264d_68Ruy9n-/view?usp=drive_link)