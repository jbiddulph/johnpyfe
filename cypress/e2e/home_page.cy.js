
// describe('The Home Page', () => {
//   it('successfully loads', () => {
//     cy.visit('/')
//     cy.contains('Home').click()
//     cy.url().should('include', '/')
//     cy.contains('Login').click()
//     cy.url().should('include', '/login')
    // Get an input, type into it
   // cy.get('#username').type('quincy@quincy.com')
    //  Verify that the value has been updated
//     cy.get('#username').should('have.value', 'quincy@quincy.com')
//     cy.contains('Register').click()
//     cy.url().should('include', '/register')
//   })
// })
// Login test
// describe('Login Test', () => {
//   it('Logs in successfully', () => {
      // cy.visit('/login') // Visit the login page
      // cy.url().should('include', '/login') // Verify if you are on the login page

      // Type username
      // cy.get('#username').type('quincy')
      // cy.get('#username').should('have.value', 'quincy') // Verify username value

      // Type password
      // cy.get('#password').type('quincy')
      // cy.get('#password').should('have.value', 'quincy') // Verify password value

      // Click on the login button
      // cy.get('#loginBtn').click()

      // Verify redirection to homepage after successful login
      // cy.url().should('eq', Cypress.config().baseUrl + '/', { timeout: 10000 }) // Assuming base URL is set in Cypress config
      // cy.url().should('eq', Cypress.config().baseUrl + '/', { timeout: 70000 })
      
      
      // cy.visit('https://lookwhatfound.me/')
      // cy.url().should('eq', 'https://lookwhatfound.me/')

      // Verify successful login message
      // cy.contains('Welcome quincy, you are logged in').should('be.visible')
  })
})